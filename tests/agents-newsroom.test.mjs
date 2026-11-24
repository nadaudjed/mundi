import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {makeDailyPlan} from "../scripts/plan-newsroom.mjs";
import {runAgentDesk,runAgent,validateResearchDraft,assessReview,taskFor} from "../scripts/run-newsroom-agents.mjs";
import {appendHistory} from "../scripts/agent-ledger.mjs";

const roster=JSON.parse(readFileSync("editorial/agents/roster.json","utf8"));
const ideas=JSON.parse(readFileSync("editorial/library/evergreen-ideas.json","utf8"));
const published=JSON.parse(readFileSync("content/publications.json","utf8"));
const date="2026-11-23T12:00:00.000Z";
const lead={title:"Official energy update",link:"https://ec.europa.eu/eurostat/news/energy-test",
  publisher:"Eurostat",topicHint:"energie",publishedAt:"2026-11-22T09:00:00Z",
  status:"candidate_unverified"};
function plan(stockItems=[lead],history={version:1,entries:[]}){
  return makeDailyPlan({roster,ideas,publications:published,stock:{items:stockItems},history,now:date});
}

test("roster defines 12 specialist reporters, 12 teachers and one checker",()=>{
  assert.equal(roster.journalists.length,12);
  assert.equal(roster.professors.length,12);
  assert.equal(new Set(roster.journalists.map(x=>x.topic)).size,12);
  assert.equal(new Set(roster.professors.map(x=>x.topic)).size,12);
  assert.equal(roster.review.autoPublish,true);
  assert.equal(roster.targetPerDay,24);
  assert.equal(roster.professorsPerDay,12);
});
test("24 assignments: 12 reporter beats + 12 concept explanations, each with fallbacks",()=>{
  const p=plan();
  assert.equal(p.jobs.length,24);
  assert.equal(p.counts.journalist,12);
  assert.equal(p.counts.professors,12);
  assert.equal(new Set(p.jobs.map(x=>x.agentId)).size,24);
  const grounded=p.jobs.find(x=>x.source);
  assert.equal(grounded.alternates.at(-1).status,"research_required_no_lead");
  assert.ok(p.jobs.filter(x=>x.role==="professor").every(x=>x.alternates.at(-1)?.status==="research_required_free_concept"));
  assert.equal(p.counts.journalistGrounded,1);
  assert.equal(p.counts.blocked,0);
  assert.equal(p.counts.journalistNeedsFreshResearch,11);
  assert.equal(p.jobs.filter(x=>x.role==="journalist"&&x.source).length,1);
  assert.equal(p.counts.verified,0);
  assert.equal(p.counts.published,0);
  assert.ok(p.jobs.filter(x=>x.role==="professor").every(x=>x.status==="research_required"));
  assert.match(taskFor({role:"professor",status:"research_required_free_concept"}),/différent des sujets déjà publiés/);
});
test("reporters without an RSS lead still have an explicit web-research assignment, not fictitious facts",()=>{
  assert.equal(plan([]).jobs.filter(x=>x.role==="journalist"&&x.source).length,0);
  assert.equal(plan([]).counts.journalistNeedsFreshResearch,12);
  assert.ok(plan([]).jobs.filter(x=>x.role==="journalist").every(x=>x.status==="research_required_no_lead"));
  const stale={...lead,publishedAt:"2024-11-22T09:00:00Z"};
  assert.equal(plan([stale]).counts.journalistGrounded,0);
  assert.equal(plan([{...lead,link:"javascript:bad"}]).counts.journalistGrounded,0);
});
test("news lead is not assigned twice after a finished check, except when source headline materially changes",()=>{
  const p=plan();
  const job=p.jobs.find(x=>x.source);
  const h={version:1,entries:[{key:job.recordKey,status:"completed",at:date}]};
  assert.equal(plan([lead],h).counts.journalistGrounded,0);
  const changed={...lead,title:"Official energy update corrected"};
  assert.equal(plan([changed],h).counts.journalistGrounded,1);
});
test("AI-key absence results in planning reports only, never fabricated drafts",async()=>{
  const out=await runAgentDesk(plan(),{key:"",model:"",maximum:24});
  assert.equal(out.completed,24,"no alternate is tried without credentials");
  assert.equal(out.agentsWithPublishableDraft,0);
  assert.equal(out.generated,0);
  assert.equal(out.machineChecked,0);
  assert.equal(out.publiclyPublished,0);
  assert.ok(out.outputs.every(x=>x.draft===null&&x.assessment.safeForAutopublication===false));
});
const draft={
  topic:"energie",contentType:"today",eventDate:"2026-11-22",title:"Électricité : comprendre les réseaux",
  summary:"Une explication prudente des réseaux et du fonctionnement des équilibres électriques.",
  keyPoints:["Une idée importante sur les réseaux électriques.","Un deuxième point avec ses limites.","Le dernier point à lire avec ses sources."],
  sections:[{kind:"fait",heading:"Le mécanisme",text:"La variation de la demande appelle des ajustements permanents de la production et du réseau."},
  {kind:"analyse",heading:"Les implications",text:"Chaque technologie a ses propres limites, coûts et exigences techniques qui ne se confondent pas."}],
  sources:[{label:"Organisation institutionnelle A",url:"https://ec.europa.eu/eurostat/news/p"},
           {label:"Organisation institutionnelle B",url:"https://www.iea.org/news/p"}],
  claims:[{statement:"Une première assertion à vérifier",evidenceUrls:["https://ec.europa.eu/eurostat/news/p"]},
          {statement:"Une deuxième assertion à vérifier",evidenceUrls:["https://www.iea.org/news/p"]},
          {statement:"Une troisième assertion à vérifier",evidenceUrls:["https://www.iea.org/news/p"]}]
};
function checked(){return {verdict:"pass",independentlyChecked:true,
  sensitiveFlags:[],uncertainties:[],claimChecks:draft.claims.map(x=>({
    statement:x.statement,supported:true,evidenceUrls:x.evidenceUrls,note:"Contrôle documentaire."}))};}
test("checker may mark low-risk draft reviewed internally but NEVER eligible for direct publication",()=>{
  const job={topic:"energie"};
  assert.deepEqual(validateResearchDraft(draft,job),[]);
  const a=assessReview(draft,checked(),job);
  assert.equal(a.status,"machine_checked_pending_policy");
  assert.equal(a.safeForAutopublication,false);
  assert.equal(a.independentOrganisations,2);
});
test("single institutional publisher and fabricated evidence fail the checker",()=>{
  const wrong=structuredClone(draft);
  wrong.sources[1].url="https://environment.ec.europa.eu/news/another";
  wrong.claims[1].evidenceUrls=[wrong.sources[1].url];
  wrong.claims[2].evidenceUrls=[wrong.sources[1].url];
  assert.match(validateResearchDraft(wrong,{topic:"energie"}).join(" "),/Two different source organisations/);
  const unsupported=checked();unsupported.claimChecks[0].supported=false;
  assert.equal(assessReview(draft,unsupported,{topic:"energie"}).status,"needs_human_or_more_research");
});
test("sensitive domains are flagged but, once sourced and approved, may be published (founder's decision)",()=>{
  const risk=structuredClone(draft);risk.topic="geopolitique";
  const out=assessReview(risk,checked(),{topic:"geopolitique"});
  assert.equal(out.sensitive,true);
  assert.equal(out.safeForAutopublication,false);
  assert.equal(out.status,"machine_checked_pending_policy");
  const unsupported=checked();unsupported.claimChecks[0].supported=false;
  assert.equal(assessReview(risk,unsupported,{topic:"geopolitique"}).status,"needs_human_or_more_research");
});
test("history stores only actually checked drafts, not blocked or no-key runs",()=>{
  const k=plan().jobs.find(x=>x.source);
  const result={format:"mundi-agent-day-v1",date:"2026-11-23",outputs:[
    {id:k.id,recordKey:k.recordKey,status:"draft_not_published",draft,checker:checked(),createdAt:date},
    {id:"blocked",recordKey:"news:fictitious",status:"draft_not_published",draft:null,checker:null,createdAt:date}
  ]};
  const history=appendHistory({version:1,entries:[]},result);
  assert.equal(history.entries.length,1);
  assert.equal(history.entries[0].articlePublished,false);
});

test("Claude secret auto-configures the private newsroom without requiring repository variables",async()=>{
  const out=await runAgentDesk(plan(),{key:"",claudeKey:"test-secret",maximum:0});
  assert.equal(out.configuration.writerProvider,"anthropic");
  assert.equal(out.configuration.checkerProvider,"anthropic");
  assert.equal(out.configuration.writerModel,"claude-sonnet-5-5");
  assert.equal(out.configuration.ready,true);
  assert.equal(out.generated,0);
  assert.equal(out.publiclyPublished,0);
});
test("mixed-provider checker needs its own model and key; never silently proceeds",async()=>{
  const out=await runAgentDesk(plan(),{
    key:"",claudeKey:"test-secret",checkerProvider:"openai",maximum:1
  });
  assert.equal(out.configuration.ready,false);
  assert.ok(out.configuration.missing.includes("OPENAI_API_KEY"));
  assert.ok(out.configuration.missing.includes("MUNDI_CHECKER_MODEL"));
  assert.equal(out.generated,0);
  assert.equal(out.publiclyPublished,0);
});

test("live writer and checker pass mocked API responses end-to-end (no checker TDZ)",async()=>{
  const p=plan();
  p.jobs[0]={...p.jobs[0],topic:"energie",status:"research_required"};
  const originalFetch=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{
    const content=calls++===0?draft:checked();
    return {ok:true,json:async()=>({
      type:"message",stop_reason:"end_turn",
      content:[
        {type:"server_tool_use",name:"web_search",id:"test-search",input:{query:"energy"}},
        {type:"text",text:JSON.stringify(content)}
      ]
    })};
  };
  try{
    const out=await runAgentDesk(p,{
      provider:"anthropic",claudeKey:"test-secret",model:"claude-test",maximum:1,
      fetcher:async()=>({status:200,ok:true})
    });
    assert.equal(calls,2,"one writer call and one independent checker call");
    assert.equal(out.generated,1);
    assert.equal(out.machineChecked,1);
    assert.equal(out.outputs[0].checker.verdict,"pass");
    assert.equal(out.outputs[0].error,null);
    assert.equal(out.outputs[0].assessment.safeForAutopublication,false);
    assert.equal(out.publiclyPublished,0);
  }finally{
    globalThis.fetch=originalFetch;
  }
});

test("evidence links missing from sources are added, and a fourth key point is dropped",async()=>{
  const {tidyDraft}=await import("../scripts/run-newsroom-agents.mjs");
  const d=structuredClone(draft);
  d.keyPoints.push("Un quatrième point en trop dans le brouillon.");
  d.claims[0].evidenceUrls.push("https://www.insee.fr/fr/statistiques/1");
  tidyDraft(d);
  assert.equal(d.keyPoints.length,3);
  assert.deepEqual(d.sources.at(-1),{label:"insee.fr",url:"https://www.insee.fr/fr/statistiques/1"});
  assert.deepEqual(validateResearchDraft(d,{topic:"energie"}),[]);
});

test("a draft the checker doubts gets one correction round and a fresh independent check",async()=>{
  const p=plan();
  p.jobs[0]={...p.jobs[0],topic:"energie",status:"research_required"};
  const doubt={...checked(),verdict:"needs_review",reason:"Une affirmation non confirmée."};
  doubt.claimChecks[0].supported=false;
  const replies=[draft,doubt,draft,checked()];
  const originalFetch=globalThis.fetch;
  let calls=0;const bodies=[];
  globalThis.fetch=async(_url,init)=>{
    bodies.push(JSON.parse(init.body));
    const content=replies[calls++];
    return {ok:true,json:async()=>({type:"message",stop_reason:"end_turn",content:[
      {type:"server_tool_use",name:"web_search",id:"s",input:{query:"q"}},
      {type:"text",text:JSON.stringify(content)}]})};
  };
  try{
    const out=await runAgentDesk(p,{provider:"anthropic",claudeKey:"test-secret",model:"claude-test",maximum:1});
    assert.equal(calls,4,"writer, checker, revision, second checker");
    assert.match(bodies[2].messages[0].content,/checkerReport/);
    assert.equal(out.outputs[0].checker.verdict,"pass");
    assert.equal(out.outputs[0].assessment.status,"machine_checked_pending_policy");
    assert.equal(out.outputs[0].revision.firstVerdict,"needs_review");
    assert.equal(out.publiclyPublished,0);
  }finally{globalThis.fetch=originalFetch;}
});

const goodDraft=(title,urls=["https://ec.europa.eu/eurostat/news/p","https://www.iea.org/reports/x"])=>({
  draft:{title,summary:"Un résumé suffisamment long pour être publié sur MUNDI.",topic:"energie",
    keyPoints:["Première idée clé assez longue.","Deuxième idée clé assez longue.","Troisième idée clé assez longue."],
    sections:[{kind:"fait",heading:"Les faits",text:"Un texte de section suffisamment long pour passer."},
      {kind:"analyse",heading:"L analyse",text:"Un autre texte de section suffisamment long pour passer."}],
    sources:urls.map((url,i)=>({label:"Source "+i,url}))},
  checker:{verdict:"pass",independentlyChecked:true,uncertainties:[]},
  assessment:{status:"machine_checked_pending_policy"},searchedUrls:urls});
const cfg={writer:{key:"k"},checker:{key:"k"}};
const okFetch=async()=>({status:200,ok:true});
test("an agent tries its alternates until one draft passes every publication check",async()=>{
  const job={id:"j",agentId:"a",role:"journalist",topic:"energie",status:"candidate_unverified",
    alternates:[{status:"candidate_unverified",title:"Piste 2"},{status:"research_required_no_lead",title:null}]};
  const seen=[];
  const run=async(j)=>{seen.push(j);return j.attempt===1
    ?{id:j.id,draft:null,assessment:{status:"needs_human_or_more_research"}}
    :{id:j.id,attempt:j.attempt,...goodDraft("Un titre publiable sur l énergie")};};
  const outs=await runAgent(job,cfg,{run,fetcher:okFetch});
  assert.equal(outs.length,2,"stops at the first publishable draft");
  assert.equal(seen[1].title,"Piste 2");
  assert.equal(seen[1].id,"j-2");
  assert.equal(outs[1].publishable,true);
});
test("a checked draft that would be a duplicate does not count: the agent keeps trying",async()=>{
  const job={id:"j",agentId:"a",role:"professor",topic:"energie",status:"research_required",
    alternates:[{status:"research_required_free_concept",title:null}]};
  const existing=[{title:"Déjà publié",slug:"deja-publie",sources:[]}];
  const run=async(j)=>({id:j.id,...goodDraft(j.attempt===1?"Déjà publié":"Un nouveau concept clair")});
  const outs=await runAgent(job,cfg,{run,fetcher:okFetch,existing});
  assert.equal(outs[0].publishable,false);
  assert.match(outs[0].publishBlockers.join(" "),/doublon/);
  assert.equal(outs[1].publishable,true);
});
test("an agent never exceeds its attempt budget and unreachable links block publication",async()=>{
  const job={id:"j",agentId:"a",role:"journalist",topic:"energie",status:"candidate_unverified",
    alternates:[{title:"2"},{title:"3"},{title:"4"}]};
  let n=0;const run=async(j)=>{n++;return {id:j.id,...goodDraft("Titre "+j.attempt+" assez long")};};
  const outs=await runAgent(job,cfg,{run,maxAttempts:3,fetcher:async()=>({status:404,ok:false})});
  assert.equal(n,3);
  assert.ok(outs.every(o=>o.publishable===false&&/injoignables/.test(o.publishBlockers[0])));
});

test("règle des titres : 90 caractères au plus, sans parenthèse méthodologique",async()=>{
  const {titleRuleProblems}=await import("../scripts/run-newsroom-agents.mjs");
  assert.deepEqual(titleRuleProblems("Électricité : comprendre les réseaux"),[]);
  assert.match(titleRuleProblems("Ménages avec enfants : 23,3 % en 2025 (23,4 % dans une publication de mai)").join(" "),/parenthesis/);
  assert.match(titleRuleProblems("x".repeat(91)).join(" "),/longer than 90/);
});
test("news must carry the date of the event, within the last 31 days",()=>{
  const job={role:"journalist",topic:"energie",date:"2026-11-23"};
  const ok=validateResearchDraft(structuredClone(draft),job);
  assert.ok(!ok.some(e=>e.startsWith("eventDate")));
  const {eventDate,...noDate}=structuredClone(draft);
  assert.ok(validateResearchDraft(noDate,job).some(e=>e.startsWith("eventDate")));
  assert.ok(validateResearchDraft({...draft,eventDate:"2026-12-20"},job).some(e=>e.startsWith("eventDate")));
  assert.ok(!validateResearchDraft(noDate,{...job,role:"professor"}).some(e=>e.startsWith("eventDate")));
});
