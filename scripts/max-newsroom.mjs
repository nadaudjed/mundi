#!/usr/bin/env node
/**
 * MUNDI newsroom on the Claude Max subscription (no paid API call).
 * Scheduled Claude Code tasks play the journalists, professors and checker; this script only
 * prepares their briefs and assembles their files. Publication stays with
 * scripts/autopublish-agents.mjs (same filters, same kill switch), run by .github/workflows/max-publish.yml.
 *
 *   node scripts/max-newsroom.mjs brief <journalist|professor> <batch 1|2>   # writer brief
 *   node scripts/max-newsroom.mjs check <journalist|professor>               # checker brief
 *   node scripts/max-newsroom.mjs validate <agentId>                         # format check of one draft
 *   node scripts/max-newsroom.mjs revise                                     # drafts the checker sent back (one round)
 *   node scripts/max-newsroom.mjs assemble                                   # results.json for autopublish
 * Files live in the private editorial-stock worktree: editorial/agents/max/<day>/ (morning) and
 * editorial/agents/max/<day>-aprem/ (afternoon edition, MUNDI_EDITION=aprem).
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from "node:fs";
import {resolve,join,dirname} from "node:path";
import {pathToFileURL} from "node:url";
import {makeDailyPlan} from "./plan-newsroom.mjs";
import {dataCardErrors,cleanCard} from "./data-cards-check.mjs";
import {WRITER_SYSTEM,CHECKER_SYSTEM,REVISION_TASK,assessReview,validateResearchDraft,tidyDraft,taskFor} from "./run-newsroom-agents.mjs";

export const BATCH=6;
const read=p=>JSON.parse(readFileSync(p,"utf8"));
const short=(s,n)=>typeof s==="string"?s.trim().slice(0,n):"";

/** The day's 24 assignments, deterministic for a given stock, ledger and date. */
export function dailyPlan({repo=".",stockDir,now=new Date().toISOString(),edition="matin"}){
  const roster=read(join(repo,"editorial/agents/roster.json"));
  const ideas=read(join(repo,"editorial/library/evergreen-ideas.json"));
  const publications=read(join(repo,"content/publications.json"));
  const s=join(stockDir,"editorial/library/candidates.json"),h=join(stockDir,"editorial/agents/ledger.json");
  const stock=existsSync(s)?read(s):{items:[]};
  const history=existsSync(h)?read(h):{version:1,entries:[]};
  // The afternoon never reuses a lead already given to the morning edition.
  const morning=join(stockDir,"editorial/agents/max",now.slice(0,10),"plan.json");
  const exclude=edition!=="matin"&&existsSync(morning)?read(morning).jobs.flatMap(j=>[j,...(j.alternates??[])]).map(a=>a.source?.url).filter(Boolean):[];
  return makeDailyPlan({roster,ideas,stock,publications,history,now,edition,exclude});
}
export function batchJobs(plan,role,batch){
  const jobs=plan.jobs.filter(j=>role==="journalist"?j.role==="journalist":j.role!=="journalist");
  return jobs.slice((batch-1)*BATCH,batch*BATCH);
}
/** Assemble writer and checker files into the mundi-agent-day-v1 format read by autopublish. */
export function assemble(plan,drafts,checks){
  const outputs=[];
  for(const job of plan.jobs){
    const d=drafts[job.agentId];
    if(!d)continue;
    const attempt=Math.max(1,Math.min(1+(job.alternates?.length??0),Number(d.attempt)||1));
    const base=attempt===1?job:{...job,...job.alternates[attempt-2],id:job.id+"-"+attempt};
    const draft=d.draft&&typeof d.draft==="object"?tidyDraft(structuredClone(d.draft)):null;
    if(draft)draft.topic=draft.topic??job.topic;
    const checker=checks[job.agentId]?.checker??null;
    let assessment;
    if(!draft)assessment={status:"not_run",safeForAutopublication:false,reasons:[short(d.error,300)||"Aucun brouillon"]};
    else if(!checker){const r=validateResearchDraft(draft,job);
      assessment={status:"needs_human_or_more_research",safeForAutopublication:false,reasons:r.length?r:["Vérification pas encore faite"]};}
    else assessment=assessReview(draft,checker,job);
    const kind=job.role==="journalist"?"actualite":base.status==="research_required_story"?"recit":"concept";
    outputs.push({format:"mundi-agent-output-v1",id:base.id,date:plan.date,agentId:job.agentId,attempt,role:job.role,kind,topic:job.topic,
      originalAssignment:base.title,recordKey:base.recordKey,sourceLead:base.source,previousPublication:job.previousPublication,
      draft,checker,assessment,error:short(d.error,350)||null,createdAt:d.createdAt||new Date().toISOString(),
      status:"draft_not_published",engine:"claude-max-scheduled-task",
      searchedUrls:Array.isArray(d.searchedUrls)?d.searchedUrls.filter(u=>typeof u==="string").slice(0,60):[]});
  }
  return {format:"mundi-agent-day-v1",date:plan.date,target:plan.target,completed:outputs.length,
    agents:plan.jobs.length,engine:"claude-max-scheduled-task",
    usage:{calls:0,inputTokens:0,outputTokens:0,webSearches:0,retries:0,estimatedUsd:0},
    notice:"Rédaction et vérification par des tâches planifiées Claude (abonnement), sans appel API payant. Contrôle IA, sans relecture humaine.",
    generated:outputs.filter(x=>x.draft).length,
    machineChecked:outputs.filter(x=>x.assessment.status==="machine_checked_pending_policy").length,
    publiclyPublished:0,configuration:{writerProvider:"claude-max",checkerProvider:"claude-max",ready:true,missing:[]},outputs};
}
function readDir(dir){
  const out={};if(!existsSync(dir))return out;
  for(const f of readdirSync(dir).filter(f=>f.endsWith(".json"))){
    try{out[f.replace(/\.json$/,"")]=read(join(dir,f));}catch(e){out[f.replace(/\.json$/,"")]={error:"JSON illisible : "+e.message};}
  }
  return out;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [cmd,role,batchArg]=process.argv.slice(2);
  const stockDir=resolve(process.env.MUNDI_STOCK_DIR||"../mundi-stock");
  const now=process.env.MUNDI_RUN_DATE||new Date().toISOString();
  // MUNDI_EDITION=aprem works in editorial/agents/max/<day>-aprem/ (morning keeps editorial/agents/max/<day>/).
  const edition=process.env.MUNDI_EDITION||"matin";
  if(!["matin","aprem"].includes(edition)){console.error("MUNDI_EDITION inconnu");process.exit(2);}
  const dayDir=join(stockDir,"editorial/agents/max",now.slice(0,10)+(edition==="matin"?"":"-"+edition));
  const planFile=join(dayDir,"plan.json");
  // The plan is frozen by the first task of the day, so every batch works from the same assignments.
  const plan=existsSync(planFile)?read(planFile):dailyPlan({stockDir,now,edition});
  if(!existsSync(planFile)){mkdirSync(dayDir,{recursive:true});writeFileSync(planFile,JSON.stringify(plan,null,2)+"\n");}
  if(cmd==="brief"){
    const batch=Number(batchArg)||1;
    const jobs=batchJobs(plan,role,batch).map(j=>({agentId:j.agentId,role:j.role,topic:j.topic,
      attempts:[j,...j.alternates].map((a,i)=>({attempt:i+1,status:a.status,title:a.title,angle:a.angle,sourceLead:a.source,task:taskFor({...j,...a})})),
      previousPublication:j.previousPublication,previouslyPublishedOnSameBeat:j.relatedPublications}));
    console.log(JSON.stringify({date:plan.date,outputDir:join(dayDir,"drafts"),writerInstructions:WRITER_SYSTEM,jobs},null,2));
  }else if(cmd==="check"){
    const drafts=readDir(join(dayDir,"drafts")),checks=readDir(join(dayDir,"checks"));
    const todo=plan.jobs.filter(j=>(role?(role==="journalist")===(j.role==="journalist"):true)&&drafts[j.agentId]?.draft&&!checks[j.agentId])
      .map(j=>({agentId:j.agentId,topic:j.topic,draft:drafts[j.agentId].draft}));
    console.log(JSON.stringify({date:plan.date,outputDir:join(dayDir,"checks"),checkerInstructions:CHECKER_SYSTEM,drafts:todo},null,2));
  }else if(cmd==="revise"){
    // One correction round, as in the API newsroom: the writer fixes what the checker could not confirm,
    // then a NEW independent check decides (the old check is archived in checks/history/).
    const drafts=readDir(join(dayDir,"drafts")),checks=readDir(join(dayDir,"checks"));
    // link-issues.json is written by the publication workflow: {agentId: ["url (HTTP 404)", ...]} for drafts the
    // checker passed but whose links failed the independent link check. They get the same single correction round.
    const linkFile=join(dayDir,"link-issues.json"),links=existsSync(linkFile)?read(linkFile):{};
    const broken=id=>Array.isArray(links[id])?links[id]:[];
    const todo=plan.jobs.filter(j=>drafts[j.agentId]?.draft&&checks[j.agentId]?.checker&&!(drafts[j.agentId].revision>=1)
        &&(checks[j.agentId].checker.verdict==="needs_review"||(checks[j.agentId].checker.verdict==="pass"&&broken(j.agentId).length)))
      .map(j=>({agentId:j.agentId,topic:j.topic,role:j.role,draft:drafts[j.agentId].draft,checkerReport:checks[j.agentId].checker,
        brokenLinks:broken(j.agentId),
        draftFile:join(dayDir,"drafts",j.agentId+".json"),checkFile:join(dayDir,"checks",j.agentId+".json"),
        archiveCheckTo:join(dayDir,"checks","history",j.agentId+"-1.json")}));
    console.log(JSON.stringify({date:plan.date,writerInstructions:WRITER_SYSTEM,revisionTask:REVISION_TASK,drafts:todo},null,2));
  }else if(cmd==="validate"){
    // Writers check the format of their own file before pushing it: node scripts/max-newsroom.mjs validate <agentId>
    const f=join(dayDir,"drafts",role+".json");const d=read(f);const job=plan.jobs.find(j=>j.agentId===d.agentId);
    if(!job){console.error("agentId inconnu dans le plan du jour");process.exit(1);}
    const errors=d.draft?validateResearchDraft(tidyDraft(structuredClone(d.draft)),job):["draft absent"];
    const cardErrors=d.draft?.dataCards===undefined?[]:dataCardErrors(d.draft.dataCards.map?.(cleanCard)??d.draft.dataCards,(d.draft.sources??[]).map(s=>s?.url));
    if(cardErrors.length)console.log("CARTES DONNÉES À CORRIGER (sinon elles seront retirées) : "+cardErrors.join(" ; "));
    console.log(errors.length?"À CORRIGER : "+errors.join(" ; "):"OK : format valide (la vérification reste à faire)");
    process.exit(errors.length?1:0);
  }else if(cmd==="assemble"){
    const result=assemble(plan,readDir(join(dayDir,"drafts")),readDir(join(dayDir,"checks")));
    writeFileSync(join(dayDir,"results.json"),JSON.stringify(result,null,2)+"\n");
    console.log("MUNDI Max "+plan.date+": "+result.generated+" brouillons, "+result.machineChecked+" validés par le vérificateur sur "+result.agents+" agents.");
  }else{console.error("Usage: brief <role> <batch> | check [role] | assemble");process.exit(2);}
}
