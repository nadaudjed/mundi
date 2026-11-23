import test from "node:test";
import assert from "node:assert/strict";
import {
  anthropicRequest,parseAnthropicResponse,resolveAgentProviders,
  askAgentModel,WRITER_SCHEMA,CHECKER_SCHEMA
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

test("Claude request enables web search and a strict editorial JSON schema",()=>{
  const a=anthropicRequest("Écris des faits", {topic:"energie"},"claude-model","writer");
  assert.equal(a.model,"claude-model");
  assert.deepEqual(a.tools,[{type:"web_search_20250305",name:"web_search",max_uses:4}]);
  assert.equal(a.output_config.format.type,"json_schema");
  assert.equal(a.output_config.format.schema,WRITER_SCHEMA);
  assert.equal(a.output_config.format.schema.additionalProperties,false);
  const b=anthropicRequest("Contrôle les sources",{},"checker-model","checker");
  assert.equal(b.output_config.format.schema,CHECKER_SCHEMA);
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

test("Claude rejects no-search, incomplete, errored or non-JSON responses",()=>{
  assert.throws(()=>parseAnthropicResponse({
    type:"message",stop_reason:"end_turn",content:[{type:"text",text:"{}"}]
  }),/did not invoke independent web search/);
  assert.throws(()=>parseAnthropicResponse({
    ...modelReply({}),stop_reason:"max_tokens"
  }),/did not finish/);
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
