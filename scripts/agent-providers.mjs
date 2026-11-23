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
export function anthropicRequest(system,payload,model,kind="writer"){
  if(!model||typeof model!=="string")throw new Error("Claude model is not configured");
  return {
    model, max_tokens:kind==="writer"?4600:3200,
    system, messages:[{role:"user",content:JSON.stringify(payload)}],
    tools:[{type:"web_search_20250305",name:"web_search",max_uses:4}],
    output_config:{format:{type:"json_schema",schema:kind==="writer"?WRITER_SCHEMA:CHECKER_SCHEMA}}
  };
}
export function parseAnthropicResponse(data){
  if(!data||data.type!=="message"||data.stop_reason!=="end_turn")
    throw new Error("Claude response did not finish");
  if(!Array.isArray(data.content))throw new Error("Claude content missing");
  if(data.content.some(block=>block.type==="web_search_tool_result"&&
    (block.content?.type==="web_search_tool_result_error"||
      (Array.isArray(block.content)&&block.content.some(v=>v.type==="web_search_tool_result_error")))))
    throw new Error("Claude web search reported an error");
  if(!data.content.some(block=>block.type==="server_tool_use"&&block.name==="web_search"))
    throw new Error("Claude did not invoke independent web search");
  const result=data.content.filter(block=>block.type==="text").map(block=>block.text).join("\n");
  if(!result||result.length>45000)throw new Error("Claude did not return a usable JSON draft");
  return JSON.parse(result);
}
function parseOpenAIResponse(data){
  if(data?.status!=="completed")throw new Error("OpenAI response did not finish");
  const content=(data.output??[]).filter(x=>x.type==="message")
    .flatMap(x=>x.content??[]).filter(x=>x.type==="output_text")
    .map(x=>x.text).join("\n");
  if(!content||content.length>45000)throw new Error("OpenAI did not return a usable JSON draft");
  return JSON.parse(content);
}
export async function askAgentModel(system,payload,{provider,key,model},kind="writer",fetcher=fetch){
  if(!PROVIDERS.has(provider))throw new Error("Unknown provider");
  if(!model||!key)throw new Error("Model or API credential missing");
  const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),110000);
  const isClaude=provider==="anthropic";
  const body=isClaude?anthropicRequest(system,payload,model,kind):{
    model,store:false,tools:[{type:"web_search"}],
    text:{format:{type:"json_object"}},max_output_tokens:kind==="writer"?3600:2700,
    input:[{role:"system",content:system},{role:"user",content:JSON.stringify(payload)}]
  };
  try{
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
      throw new Error(provider+" API HTTP "+response.status+(hint?" — "+hint:""));
    }
    const result=await response.json();
    return isClaude?parseAnthropicResponse(result):parseOpenAIResponse(result);
  }finally{clearTimeout(timeout);}
}
