import test from "node:test";
import assert from "node:assert/strict";
import {
  anthropicRequest,parseAnthropicResponse,resolveAgentProviders,
  askAgentModel,WRITER_SCHEMA,CHECKER_SCHEMA,inferAgentSelection,DEFAULT_CLAUDE_MODEL
} from "../scripts/agent-providers.mjs";

test("Claude replaces OpenAI for writers without changing the checker choice",()=>{
  const a=resolveAgentProviders({
    provider:"anthropic",checkerProvider:"openai",
    model:"claude-model-selected-by-user",checkerModel:"openai-checker-model",
    anthropicKey:"anthropic-secret",openaiKey:"openai-secret"
  });
  assert.deepEqual(a.writer,{provider:"anthropic",model:"claude-model-selected-by-user",key:"anthropic-secret"});
  assert.deepEqual(a.checker,{provider:"openai",model:"openai-checker-model",key:"openai-secret"});
  assert.throws(()=>resolveAgentProviders({provider:"invalid"}),/Unsupported agent provider/);
  const b=resolveAgentProviders({provider:"anthropic",model:"claude-model",anthropicKey:"secret"});
  assert.equal(b.checker.provider,"anthropic");
  assert.equal(b.checker.model,"claude-model");
  const c=resolveAgentProviders({provider:"anthropic",checkerProvider:"openai",model:"claude-only"});
  assert.equal(c.checker.model,"","must not silently pass a Claude model ID to OpenAI");
});

test("Claude request enables web search and asks for the editorial JSON schema in the prompt",()=>{
  const a=anthropicRequest("Écris des faits", {topic:"energie"},"claude-model","writer");
  assert.equal(a.model,"claude-model");
  assert.deepEqual(a.tools,[{type:"web_search_20250305",name:"web_search",max_uses:4}]);
  // Web search always cites its results; the API returns HTTP 400 for citations + output_config.format.
  assert.equal(a.output_config,undefined);
  assert.ok(a.system.startsWith("Écris des faits"));
  assert.ok(a.system.includes(JSON.stringify(WRITER_SCHEMA)));
  const b=anthropicRequest("Contrôle les sources",{},"checker-model","checker");
  assert.equal(b.output_config,undefined);
  assert.ok(b.system.includes(JSON.stringify(CHECKER_SCHEMA)));
});

test("Claude JSON is read after the last search, even when citations split the text",()=>{
  const draft={topic:"energie",title:"Réseau \"électrique\"",summary:"Texte"};
  const json=JSON.stringify(draft);
  const cut=json.indexOf("Texte");
  assert.deepEqual(parseAnthropicResponse({
    type:"message",stop_reason:"end_turn",content:[
      {type:"text",text:"Je vais chercher { des sources }."},
      {type:"server_tool_use",id:"s1",name:"web_search",input:{query:"q"}},
      {type:"web_search_tool_result",tool_use_id:"s1",content:[]},
      {type:"text",text:json.slice(0,cut)},
      {type:"text",text:json.slice(cut),citations:[{type:"web_search_result_location",url:"https://example.net"}]}
    ]
  }),draft);
  assert.deepEqual(parseAnthropicResponse({
    type:"message",stop_reason:"end_turn",content:[
      {type:"server_tool_use",id:"s1",name:"web_search",input:{query:"q"}},
      {type:"web_search_tool_result",tool_use_id:"s1",content:[]},
      {type:"text",text:"```json\n"+json+"\n```"}
    ]
  }),draft);
  assert.throws(()=>parseAnthropicResponse({
    type:"message",stop_reason:"end_turn",content:[
      {type:"server_tool_use",name:"web_search"},{type:"text",text:"[1,2]"}
    ]
  }),/JSON object/);
});

const modelReply=payload=>({
  type:"message",stop_reason:"end_turn",
  content:[
    {type:"server_tool_use",id:"srvtoolu_123",name:"web_search",input:{query:"latest research"}},
    {type:"web_search_tool_result",tool_use_id:"srvtoolu_123",content:[
      {type:"web_search_result",title:"Official source",url:"https://example.net"}
    ]},
    {type:"text",text:JSON.stringify(payload)}
  ]
});

test("Claude API uses x-api-key, Messages endpoint, and does not send credentials in prompts",async()=>{
  let request;
  const expected={topic:"energie",title:"Énergie et recherche"};
  const fetcher=async(url,init)=>{
    request={url,init};
    return {ok:true,json:async()=>modelReply(expected)};
  };
  const result=await askAgentModel("Rédige", {domain:"energie"},{
    provider:"anthropic",model:"claude-model",key:"top-secret-key"
  },"writer",fetcher);
  assert.deepEqual(result,expected);
  assert.equal(request.url,"https://api.anthropic.com/v1/messages");
  assert.equal(request.init.headers["x-api-key"],"top-secret-key");
  assert.equal(request.init.headers["anthropic-version"],"2023-06-01");
  assert.equal(request.init.headers.Authorization,undefined);
  assert.ok(!request.init.body.includes("top-secret-key"));
});

test("Claude continues a paused turn and reads the JSON written after the pause",async()=>{
  const draft={topic:"energie",title:"Suite"};
  const bodies=[];
  const replies=[
    {type:"message",stop_reason:"pause_turn",content:[
      {type:"server_tool_use",id:"s1",name:"web_search",input:{query:"q"}},
      {type:"web_search_tool_result",tool_use_id:"s1",content:[]}
    ]},
    {type:"message",stop_reason:"end_turn",content:[{type:"text",text:JSON.stringify(draft)}]}
  ];
  const fetcher=async(url,init)=>{bodies.push(JSON.parse(init.body));return {ok:true,json:async()=>replies.shift()};};
  assert.deepEqual(await askAgentModel("Rédige",{},{provider:"anthropic",model:"m",key:"k"},"writer",fetcher),draft);
  assert.equal(bodies.length,2);
  assert.equal(bodies[1].messages.length,2);
  assert.equal(bodies[1].messages[1].role,"assistant");
  assert.equal(bodies[1].messages[1].content[0].type,"server_tool_use");
});

test("Claude rejects no-search, incomplete, errored or non-JSON responses",()=>{
  assert.throws(()=>parseAnthropicResponse({
    type:"message",stop_reason:"end_turn",content:[{type:"text",text:"{}"}]
  }),/did not invoke independent web search/);
  assert.throws(()=>parseAnthropicResponse({
    ...modelReply({}),stop_reason:"max_tokens"
  }),/did not finish \(stop_reason: max_tokens\)/);
  assert.throws(()=>parseAnthropicResponse({
    ...modelReply({}),content:[
      {type:"server_tool_use",name:"web_search"},
      {type:"web_search_tool_result",content:{type:"web_search_tool_result_error",error_code:"unavailable"}},
      {type:"text",text:"{}"}
    ]
  }),/reported an error/);
  assert.throws(()=>parseAnthropicResponse({
    ...modelReply({}),content:[
      {type:"server_tool_use",name:"web_search"},
      {type:"text",text:"not JSON"}
    ]
  }),SyntaxError);
});

test("OpenAI provider still uses Responses API and remains available",async()=>{
  let request;
  const fetcher=async(url,init)=>{
    request={url,init};
    return {ok:true,json:async()=>({
      status:"completed",output:[{type:"message",content:[{type:"output_text",text:'{"ok":true}'}]}]
    })};
  };
  assert.deepEqual(await askAgentModel("Vérifie",{},{
    provider:"openai",model:"selected-openai-model",key:"openai-secret"
  },"checker",fetcher),{ok:true});
  assert.equal(request.url,"https://api.openai.com/v1/responses");
  assert.equal(request.init.headers.Authorization,"Bearer openai-secret");
  assert.ok(!request.init.body.includes("openai-secret"));
});

test("API secret alone selects Claude with a documented default model",()=>{
  const inferred=inferAgentSelection({anthropicKey:"secret"});
  assert.equal(inferred.provider,"anthropic");
  assert.equal(inferred.checkerProvider,"anthropic");
  assert.equal(inferred.model,DEFAULT_CLAUDE_MODEL);
  assert.equal(inferred.checkerModel,DEFAULT_CLAUDE_MODEL);
  const openai=inferAgentSelection({
    provider:"openai",model:"gpt-selected",anthropicKey:"secret"
  });
  assert.equal(openai.provider,"openai");
  assert.equal(openai.model,"gpt-selected");
  const mixed=inferAgentSelection({
    checkerProvider:"openai",anthropicKey:"secret"
  });
  assert.equal(mixed.checkerModel,"","no Claude model reuse for a different checker provider");
  assert.equal(inferAgentSelection({}).model,"","never choose OpenAI model implicitly");
});

test("non-2xx Anthropic response exposes safe validation diagnosis, never API keys",async()=>{
  const secret="sk-ant-test-sensitive-secret";
  const fetcher=async()=>({ok:false,status:400,json:async()=>({
    error:{type:"invalid_request_error",message:"Invalid messages schema; secret "+secret}
  })});
  await assert.rejects(
    askAgentModel("system",{}, {provider:"anthropic",model:"claude-test",key:secret},"writer",fetcher),
    error=>{
      assert.match(error.message,/anthropic API HTTP 400 — invalid_request_error/);
      assert.match(error.message,/Invalid messages schema/);
      assert.doesNotMatch(error.message,/sk-ant-test-sensitive-secret/);
      return true;
    }
  );
});
