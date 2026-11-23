/**
 * One interface for OpenAI Responses API and Anthropic Messages API.
 * Explicit repo variables override a key-based Claude default.
 * API failures never silently switch providers or downgrade verification.
 */
const PROVIDERS=new Set(["openai","anthropic"]);
export const DEFAULT_CLAUDE_MODEL="claude-sonnet-5-5";
/** Select Claude when its secret alone is present; never silently switch after an API failure. */
export function inferAgentSelection({
  provider="",checkerProvider="",model="",checkerModel="",anthropicKey=""
}={}){
  const writerProvider=provider||(anthropicKey?"anthropic":"openai");
  const writerModel=model||(writerProvider==="anthropic"?DEFAULT_CLAUDE_MODEL:"");
  const chosenChecker=checkerProvider||writerProvider;
  return {
    provider:writerProvider,model:writerModel,checkerProvider:chosenChecker,
    checkerModel:checkerModel||(chosenChecker===writerProvider?writerModel:"")
  };
}
const S=(type,props={},required=Object.keys(props))=>({type,properties:props,required,additionalProperties:false});
const text={type:"string"};
const strings={type:"array",items:text};
const source=S("object",{label:text,url:text});
const claim=S("object",{statement:text,evidenceUrls:strings});
const section=S("object",{kind:{type:"string",enum:["fait","analyse","hypothese"]},heading:text,text});
export const WRITER_SCHEMA=S("object",{
  topic:text,contentType:{type:"string",enum:["today","evergreen"]},
  title:text,summary:text,keyPoints:strings,sections:{type:"array",items:section},
  sources:{type:"array",items:source},claims:{type:"array",items:claim}
});
export const CHECKER_SCHEMA=S("object",{
  verdict:{type:"string",enum:["pass","needs_review","reject"]},
  independentlyChecked:{type:"boolean"},
  claimChecks:{type:"array",items:S("object",{
    statement:text,supported:{type:"boolean"},evidenceUrls:strings,note:text
  })},
  uncertainties:strings,sensitiveFlags:strings,reason:text
});
export function resolveAgentProviders({
  provider="openai",checkerProvider=provider,
  model="",checkerModel="",
  openaiKey="",anthropicKey=""
}={}){
  if(!PROVIDERS.has(provider)||!PROVIDERS.has(checkerProvider)){
    throw new Error("Unsupported agent provider; select openai or anthropic");
  }
  const key=p=>p==="anthropic"?anthropicKey:openaiKey;
  return {
    writer:{provider,model,key:key(provider)},
    checker:{provider:checkerProvider,model:checkerModel||(checkerProvider===provider?model:""),key:key(checkerProvider)}
  };
}
/**
 * Web search always returns citations, and the Messages API rejects citations combined
 * with output_config.format (HTTP 400). So the JSON shape is requested in the system
 * prompt instead, and the drafts are still validated field by field afterwards.
 */
export function anthropicRequest(system,payload,model,kind="writer"){
  if(!model||typeof model!=="string")throw new Error("Claude model is not configured");
  const schema=kind==="writer"?WRITER_SCHEMA:CHECKER_SCHEMA;
  return {
    model, max_tokens:kind==="writer"?24000:16000, // thinking and search results count toward this budget
    system:system+"\n\nAfter your searches, answer with one JSON object only (no text before or after, no code fence), matching this JSON Schema: "+JSON.stringify(schema),
    messages:[{role:"user",content:JSON.stringify(payload)}],
    tools:[{type:"web_search_20250305",name:"web_search",max_uses:4}]
  };
}
/** The JSON object Claude wrote after its last search (text blocks may be split by citations). */
function finalJson(content){
  const lastSearch=content.map(b=>b.type).lastIndexOf("web_search_tool_result");
  const text=content.slice(lastSearch+1).filter(b=>b.type==="text").map(b=>b.text).join("").trim();
  const start=text.indexOf("{"),end=text.lastIndexOf("}");
  return start>=0&&end>start?text.slice(start,end+1):text;
}
/** Web search outcomes in a Claude reply: successful calls, error codes and result URLs. */
export function searchOutcomes(content){
  const ok=[],errors=[],urls=new Set();
  for(const block of Array.isArray(content)?content:[]){
    if(block?.type!=="web_search_tool_result")continue;
    const c=block.content;
    if(Array.isArray(c)){
      const failed=c.filter(v=>v?.type==="web_search_tool_result_error");
      if(failed.length){errors.push(...failed.map(v=>String(v.error_code||"unknown")));continue;}
      ok.push(block);
      for(const r of c)if(r?.type==="web_search_result"&&typeof r.url==="string")urls.add(r.url);
    }else if(c?.type==="web_search_tool_result_error")errors.push(String(c.error_code||"unknown"));
  }
  return {succeeded:ok.length,errors,urls:[...urls]};
}
export class WebSearchFailure extends Error{
  constructor(codes){super("Claude web search reported an error ("+(codes.join(", ")||"unknown")+")");this.codes=codes;}
}
export function parseAnthropicResponse(data){
  if(!data||data.type!=="message"||data.stop_reason!=="end_turn")
    throw new Error("Claude response did not finish (stop_reason: "+String(data?.stop_reason??"none").slice(0,40)+")");
  if(!Array.isArray(data.content))throw new Error("Claude content missing");
  if(!data.content.some(block=>block.type==="server_tool_use"&&block.name==="web_search"))
    throw new Error("Claude did not invoke independent web search");
  // One failed search among several (e.g. max_uses_exceeded on a 5th query) no longer discards
  // an otherwise researched draft: the draft is still checked claim by claim afterwards.
  // With no successful search at all, the draft has no independent research and is refused.
  const searches=searchOutcomes(data.content);
  if(searches.errors.length&&searches.succeeded===0)throw new WebSearchFailure(searches.errors);
  const result=finalJson(data.content);
  if(!result||result.length>45000)throw new Error("Claude did not return a usable JSON draft");
  const parsed=JSON.parse(result);
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("Claude did not return a JSON object");
  return parsed;
}
function parseOpenAIResponse(data){
  if(data?.status!=="completed")throw new Error("OpenAI response did not finish");
  const content=(data.output??[]).filter(x=>x.type==="message")
    .flatMap(x=>x.content??[]).filter(x=>x.type==="output_text")
    .map(x=>x.text).join("\n");
  if(!content||content.length>45000)throw new Error("OpenAI did not return a usable JSON draft");
  return JSON.parse(content);
}
/** Limited retries: transient API overload / rate limit / network errors, and searches the provider could not run. */
export const RETRY={delaysMs:[15000,45000],sleep:ms=>new Promise(r=>setTimeout(r,ms))};
const RETRYABLE_HTTP=new Set([408,429,500,502,503,504,529]);
const RETRYABLE_SEARCH=new Set(["too_many_requests","unavailable"]);
class RetryableHttp extends Error{constructor(msg,status,retryAfter){super(msg);this.status=status;this.retryAfter=retryAfter;}}
/** Adds one API reply's usage to a cost meter (tokens and billed web searches). */
export function meterUsage(meter,usage){
  if(!meter||!usage)return;
  meter.calls=(meter.calls||0)+1;
  meter.inputTokens=(meter.inputTokens||0)+(usage.input_tokens||0)+(usage.cache_creation_input_tokens||0)+(usage.cache_read_input_tokens||0);
  meter.outputTokens=(meter.outputTokens||0)+(usage.output_tokens||0);
  meter.webSearches=(meter.webSearches||0)+(usage.server_tool_use?.web_search_requests||0);
}
export async function askAgentModel(system,payload,{provider,key,model},kind="writer",fetcher=fetch,meter=null){
  for(let attempt=0;;attempt++){
    try{return await askOnce(system,payload,{provider,key,model},kind,fetcher,meter);}
    catch(error){
      const transient=error instanceof RetryableHttp||
        (error instanceof WebSearchFailure&&error.codes.some(c=>RETRYABLE_SEARCH.has(c)))||
        (error instanceof TypeError&&/fetch failed/i.test(error.message));
      // A failed search is retried once only: the retry re-bills the tokens of the whole call.
      const limit=error instanceof WebSearchFailure?1:RETRY.delaysMs.length;
      if(!transient||attempt>=limit)throw error;
      if(meter)meter.retries=(meter.retries||0)+1;
      const wait=Math.min(60000,Math.max(RETRY.delaysMs[attempt],(error.retryAfter||0)*1000));
      await RETRY.sleep(wait);
    }
  }
}
async function askOnce(system,payload,{provider,key,model},kind,fetcher,meter){
  if(!PROVIDERS.has(provider))throw new Error("Unknown provider");
  if(!model||!key)throw new Error("Model or API credential missing");
  const isClaude=provider==="anthropic";
  // Claude searches, thinks and may continue after a pause: allow it more time than one quick call.
  const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),isClaude?400000:110000);
  const body=isClaude?anthropicRequest(system,payload,model,kind):{
    model,store:false,tools:[{type:"web_search"}],
    text:{format:{type:"json_object"}},max_output_tokens:kind==="writer"?3600:2700,
    input:[{role:"system",content:system},{role:"user",content:JSON.stringify(payload)}]
  };
  async function post(){
    const response=await fetcher(isClaude?
      "https://api.anthropic.com/v1/messages":"https://api.openai.com/v1/responses",{
      method:"POST",
      headers:isClaude?{
        "Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"
      }:{
        "Content-Type":"application/json","Authorization":"Bearer "+key
      },
      body:JSON.stringify(body),signal:ctl.signal
    });
    if(!response.ok){
      // Only expose public error classification and a scrubbed provider diagnostic.
      // Never log the credential, request payload, or provider error object verbatim.
      let type="",message="";
      try{
        const body=await response.json();
        type=typeof body?.error?.type==="string"?body.error.type.slice(0,60):"";
        message=typeof body?.error?.message==="string"?body.error.message.slice(0,220):"";
      }catch{ /* The status code remains actionable without a JSON body. */ }
      const redact=s=>s.replaceAll(key,"[redacted]")
        .replace(/sk-ant-[a-zA-Z0-9_-]+/g,"[redacted]")
        .replace(/sk-proj-[a-zA-Z0-9_-]+/g,"[redacted]");
      const hint=[redact(type),redact(message)].filter(Boolean).join(": ");
      const msg=provider+" API HTTP "+response.status+(hint?" — "+hint:"");
      if(RETRYABLE_HTTP.has(response.status))
        throw new RetryableHttp(msg,response.status,Number(response.headers?.get?.("retry-after"))||0);
      throw new Error(msg);
    }
    return response.json();
  }
  try{
    if(!isClaude){
      const data=await post();
      if(meter&&data?.usage){meter.calls=(meter.calls||0)+1;meter.inputTokens=(meter.inputTokens||0)+(data.usage.input_tokens||0);meter.outputTokens=(meter.outputTokens||0)+(data.usage.output_tokens||0);}
      return parseOpenAIResponse(data);
    }
    // Long web searches can pause the turn: send the partial answer back so Claude continues it.
    const content=[];
    for(let round=0;;round++){
      const result=await post();
      if(Array.isArray(result?.content))content.push(...result.content);
      meterUsage(meter,result?.usage);
      if(result?.stop_reason!=="pause_turn"||round>=3){
        const parsed=parseAnthropicResponse({...result,content});
        // URLs actually returned by the search engine: used later to tell a bot-blocked page from an invented link.
        if(meter){const s=searchOutcomes(content);meter.searchedUrls=[...new Set([...(meter.searchedUrls||[]),...s.urls])].slice(0,200);
          if(s.errors.length)meter.searchErrors=[...(meter.searchErrors||[]),...s.errors];}
        return parsed;
      }
      body.messages=[body.messages[0],{role:"assistant",content}];
    }
  }finally{clearTimeout(timeout);}
}
