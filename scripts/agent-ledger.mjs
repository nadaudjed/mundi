#!/usr/bin/env node
/** Preserve completed AI investigations, not any public content. */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {pathToFileURL} from "node:url";
export function appendHistory(prior,day){
  if(!prior||prior.version!==1||!Array.isArray(prior.entries))throw new Error("Invalid history ledger");
  if(day?.format!=="mundi-agent-day-v1"||!Array.isArray(day.outputs))throw new Error("Invalid day");
  const entries=new Map(prior.entries.map(x=>[x.key,x]));
  for(const out of day.outputs){
    if(out?.status!=="draft_not_published"||!out?.recordKey)continue;
    if(!out.draft)continue;
    const checked=out.checker?.verdict;
    const status=checked==="pass"||checked==="needs_review"||checked==="reject"?"completed":null;
    if(!status)continue;
    entries.set(out.recordKey,{key:out.recordKey,status,at:out.createdAt,review:checked,
      issueId:out.id,articlePublished:false});
  }
  const since=Date.parse(day.date+"T00:00:00Z")-365*86400000;
  return {version:1,entries:[...entries.values()].filter(x=>Date.parse(x.at)>=since)
    .sort((a,b)=>a.key.localeCompare(b.key)).slice(-8000)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const file=resolve(process.env.MUNDI_AGENT_HISTORY||"reports/agents-history.json");
  const day=JSON.parse(readFileSync(resolve(process.env.MUNDI_AGENT_REPORT||"reports/agents-results.json"),"utf8"));
  const prior=existsSync(file)?JSON.parse(readFileSync(file,"utf8")):{version:1,entries:[]};
  const next=appendHistory(prior,day);
  mkdirSync(dirname(file),{recursive:true});writeFileSync(file,JSON.stringify(next,null,2)+"\n");
  console.log("MUNDI agent history: "+next.entries.length+" investigated items; never published.");
}
