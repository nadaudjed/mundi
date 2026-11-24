import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {dailyPlan,batchJobs,assemble} from "../scripts/max-newsroom.mjs";
import {blockers} from "../scripts/autopublish-agents.mjs";

const plan=dailyPlan({stockDir:mkdtempSync(join(tmpdir(),"stock-")),now:"2026-11-24T07:00:00Z"});
const urls=["https://ec.europa.eu/eurostat/news/a","https://www.iea.org/reports/b","https://www.insee.fr/fr/c"];
const draft=topic=>({topic,contentType:"evergreen",title:"Comprendre le stockage de l'électricité",
  summary:"Une explication sourcée du stockage de l'électricité et de ses limites actuelles.",
  keyPoints:["Le stockage déplace l'énergie dans le temps.","Les batteries répondent vite mais stockent peu.","Les barrages de pompage restent la première capacité."],
  sections:[{kind:"fait",heading:"Le mécanisme",text:"Le stockage absorbe l'électricité en surplus pour la restituer plus tard au réseau."},
    {kind:"analyse",heading:"Les limites",text:"Chaque technologie a un coût, une durée et un rendement différents qu'il faut comparer."}],
  sources:urls.map((url,i)=>({label:"Source "+i,url})),
  claims:urls.map(u=>({statement:"Affirmation vérifiable sur le stockage.",evidenceUrls:[u]}))});
const pass=d=>({verdict:"pass",independentlyChecked:true,uncertainties:[],sensitiveFlags:[],reason:"ok",
  claimChecks:d.claims.map(c=>({statement:c.statement,supported:true,evidenceUrls:c.evidenceUrls,note:""}))});

test("Max plan: 24 agents in four batches of six",()=>{
  assert.equal(plan.jobs.length,24);
  for(const [role,b] of [["journalist",1],["journalist",2],["professor",1],["professor",2]])
    assert.equal(batchJobs(plan,role,b).length,6);
  assert.equal(new Set([1,2].flatMap(b=>batchJobs(plan,"professor",b)).map(j=>j.agentId)).size,12);
});
test("assembled Max results go through the same checks as the API newsroom",()=>{
  const prof=plan.jobs.find(j=>j.role==="professor");
  const d=draft(prof.topic);
  const res=assemble(plan,{[prof.agentId]:{agentId:prof.agentId,attempt:1,draft:d,searchedUrls:urls}},{[prof.agentId]:{checker:pass(d)}});
  assert.equal(res.format,"mundi-agent-day-v1");
  assert.equal(res.outputs.length,1);
  assert.equal(res.outputs[0].assessment.status,"machine_checked_pending_policy");
  assert.deepEqual(blockers(res.outputs[0],[]),[]);
});
test("a draft without an independent check, or with a doubtful one, is never publishable",()=>{
  const prof=plan.jobs.find(j=>j.role==="professor");
  const d=draft(prof.topic);
  const none=assemble(plan,{[prof.agentId]:{draft:d}},{});
  assert.notEqual(none.outputs[0].assessment.status,"machine_checked_pending_policy");
  assert.ok(blockers(none.outputs[0],[]).length>0);
  const doubt={...pass(d),verdict:"needs_review"};
  const r=assemble(plan,{[prof.agentId]:{draft:d}},{[prof.agentId]:{checker:doubt}});
  assert.ok(blockers(r.outputs[0],[]).length>0);
  const failed=assemble(plan,{[prof.agentId]:{draft:null,error:"Pas deux organismes"}},{});
  assert.equal(failed.generated,0);
});
test("an alternate attempt keeps its own record key for deduplication",()=>{
  const j=plan.jobs.find(x=>x.role==="professor"&&x.alternates.length>1);
  const d=draft(j.topic);
  const r=assemble(plan,{[j.agentId]:{attempt:2,draft:d}},{[j.agentId]:{checker:pass(d)}});
  assert.equal(r.outputs[0].recordKey,j.alternates[0].recordKey);
  assert.equal(r.outputs[0].id,j.id+"-2");
});
