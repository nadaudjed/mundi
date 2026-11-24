#!/usr/bin/env node
/** MUNDI agents: deterministic daily assignments, never unsourced stories. */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {pathToFileURL} from "node:url";
import {createHash} from "node:crypto";

const iso=s=>typeof s==="string"&&Number.isFinite(Date.parse(s))?new Date(s).toISOString():null;
const hash=s=>createHash("sha256").update(s).digest("hex").slice(0,16);
const day=s=>s.slice(0,10);
const hosts=url=>{try{const u=new URL(url);return u.protocol==="https:"&&!u.username&&!u.password?u.hostname:null}catch{return null}};
/** Extra subjects an agent may try the same day when a draft fails verification. */
export const ALTERNATES=2;
/** Editions: "matin" (concepts from the idea library) and "aprem" (fresh news + real stories, history, ideas). */
export const EDITIONS=["matin","aprem"];
/** Part des articles d'une édition qui reçoivent une série de cartes « Données ». */
export const DATA_CARDS_SHARE=1/3;
export function makeDailyPlan({roster,ideas,stock,publications,history={version:1,entries:[]},now,edition="matin",exclude=[]}){
  if(!EDITIONS.includes(edition))throw new Error("Unknown edition");
  const date=iso(now),topicNames=roster?.journalists?.map(x=>x.topic)??[];
  if(!date||!Array.isArray(roster?.journalists)||!Array.isArray(roster?.professors)||
    roster.journalists.length!==12||roster.professors.length!==12||
    !Array.isArray(ideas?.items)||!Array.isArray(stock?.items)||!Array.isArray(publications)||!Array.isArray(history.entries))
    throw new Error("Malformed newsroom inputs");
  if(new Set(topicNames).size!==12||new Set(roster.professors.map(x=>x.topic)).size!==12)
    throw new Error("Duplicate domain in roster");
  const previous=new Set(history.entries.filter(x=>x?.status==="completed").map(x=>x.key));
  const nowMs=Date.parse(date),today=day(date);
  const fresh=stock.items.filter(item=>{
    const born=iso(item.publishedAt);
    return item.status==="candidate_unverified"&&hosts(item.link)&&born&&
      Date.parse(born)<=nowMs+86400000&&nowMs-Date.parse(born)<=14*86400000;
  });
  const used=new Set(exclude),jobs=[];
  const jid=id=>hash(today+(edition==='matin'?'':':'+edition)+':'+id);
  for(const agent of roster.journalists){
    const own=fresh.filter(x=>x.topicHint===agent.topic&&!previous.has("news:"+hash(x.link+"|"+x.title+"|"+x.publishedAt)));
    own.sort((a,b)=>(b.publishedAt||"").localeCompare(a.publishedAt||"")||a.link.localeCompare(b.link));
    const available=own.filter(x=>!used.has(x.link));
    const candidate=available[0];
    // Backup leads: if the first draft fails verification, the same reporter tries another
    // fresh lead, then a free search on the last 48 hours (never an unsourced story).
    const backups=available.slice(1,1+ALTERNATES);
    for(const x of [candidate,...backups])if(x)used.add(x.link);
    const previousArticle=candidate?publications.find(p=>(p.sources??[]).some(s=>s.url===candidate.link)):null;
    jobs.push({
      id:jid(agent.id),date:today,edition,agentId:agent.id,role:"journalist",topic:agent.topic,
      status:candidate?"candidate_unverified":"research_required_no_lead",
      action:previousArticle?"investigate_update":"investigate_new",
      previousPublication:previousArticle?.slug??null,
      relatedPublications:publications.filter(p=>p.topic===agent.topic).slice(0,8).map(p=>({slug:p.slug,title:p.title,summary:p.summary,updatedAt:p.updatedAt})),
      title:candidate?.title??null,angle:null,
      source:candidate?{label:candidate.publisher,url:candidate.link,publishedAt:candidate.publishedAt}:null,
      recordKey:candidate?"news:"+hash(candidate.link+"|"+candidate.title+"|"+candidate.publishedAt):null,
      sourceCount:candidate?1:0,review:"not_started",published:false,
      alternates:[...backups.map(b=>({status:"candidate_unverified",title:b.title,angle:null,
        source:{label:b.publisher,url:b.link,publishedAt:b.publishedAt},
        recordKey:"news:"+hash(b.link+"|"+b.title+"|"+b.publishedAt)})),
        ...(candidate?[{status:"research_required_no_lead",title:null,angle:null,source:null,recordKey:null}]:[])]
    });
  }
  const rotation=Math.floor(nowMs/86400000)%12;
  const perDay=Math.min(12,Math.max(0,Number(roster.professorsPerDay)||8));
  const assigned=Array.from({length:perDay},(_,i)=>roster.professors[(rotation+i)%12]);
  for(const agent of assigned){
    const related=publications.filter(p=>p.topic===agent.topic).slice(0,30).map(p=>({slug:p.slug,title:p.title}));
    if(edition==="aprem"){
      // Afternoon: a real story (historical episode, turning point, idea or ideology) linked, closely or
      // loosely, to current events in the domain. Same sourcing rules; falls back to a free concept.
      jobs.push({id:jid(agent.id),date:today,edition,agentId:agent.id,role:"professor",topic:agent.topic,
        status:"research_required_story",action:"prepare_story",previousPublication:null,relatedPublications:related,
        title:null,angle:null,source:null,recordKey:null,sourceCount:0,review:"not_started",published:false,
        alternates:[{status:"research_required_story",title:null,angle:null,source:null,recordKey:null},
          {status:"research_required_free_concept",title:null,angle:null,source:null,recordKey:null}]});
      continue;
    }
    const pool=ideas.items.filter(i=>i.topic===agent.topic&&i.status==="idea_unverified"&&i.approved===false);
    pool.sort((a,b)=>a.id.localeCompare(b.id));
    const unused=pool.filter(i=>!previous.has("lesson:"+i.id));
    const start=unused.length?Math.floor(nowMs/86400000)%unused.length:0;
    const picks=Array.from({length:Math.min(unused.length,1+ALTERNATES)},(_,k)=>unused[(start+k)%unused.length]);
    const idea=picks[0]??null;
    jobs.push({
      id:jid(agent.id),date:today,edition,agentId:agent.id,role:"professor",topic:agent.topic,
      // When the idea library is used up, the professor chooses a durable concept itself,
      // avoiding the beats already published (listed in relatedPublications).
      status:idea?"research_required":"research_required_free_concept",
      action:"prepare_evergreen_lesson",previousPublication:null,
      relatedPublications:related,
      title:idea?.title??null,angle:idea?.angle??null,
      source:null,recordKey:idea?"lesson:"+idea.id:null,
      sourceCount:0,review:"not_started",published:false,
      alternates:[...picks.slice(1).map(i=>({status:"research_required",title:i.title,angle:i.angle??null,source:null,recordKey:"lesson:"+i.id})),
        ...(idea?[{status:"research_required_free_concept",title:null,angle:null,source:null,recordKey:null}]:[])]
    });
  }
  if(jobs.length!==roster.targetPerDay)throw new Error("Daily target and roster disagree");
  // Cartes « Données » : environ un article sur trois seulement, pour varier le fil
  // (les autres restent de simples articles). Tirage stable, fondé sur l'identifiant du travail.
  const withCards=new Set([...jobs].sort((a,b)=>a.id.localeCompare(b.id)).slice(0,Math.ceil(jobs.length*DATA_CARDS_SHARE)).map(j=>j.id));
  for(const job of jobs)job.dataCards=withCards.has(job.id);
  return {
    format:"mundi-daily-agent-plan-v1",date:today,edition,createdAt:date,
    target:roster.targetPerDay,
    notice:"This is a research plan, NOT fact-checked publications. Zero automatic public edits.",
    counts:{
      scheduled:jobs.length,
      journalist:jobs.filter(x=>x.role==="journalist").length,
      professors:jobs.filter(x=>x.role==="professor").length,
      journalistGrounded:jobs.filter(x=>x.role==="journalist"&&x.source).length,
      journalistNeedsFreshResearch:jobs.filter(x=>x.role==="journalist"&&!x.source).length,
      blocked:jobs.filter(x=>x.status.startsWith("blocked_")).length,
      withDataCards:jobs.filter(x=>x.dataCards).length,
      verified:0,published:0
    },
    jobs
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const read=p=>JSON.parse(readFileSync(resolve(p),"utf8"));
  const roster=read("editorial/agents/roster.json");
  const ideas=read("editorial/library/evergreen-ideas.json");
  const publications=read("content/publications.json");
  const stockPath=process.env.MUNDI_STOCK_PATH||"reports/editorial-stock.json";
  const historyPath=process.env.MUNDI_AGENT_HISTORY||"reports/agents-history.json";
  const stock=existsSync(stockPath)?read(stockPath):{items:[]};
  const history=existsSync(historyPath)?read(historyPath):{version:1,entries:[]};
  const plan=makeDailyPlan({roster,ideas,stock,publications,history,now:process.env.MUNDI_RUN_DATE||new Date().toISOString()});
  const out=resolve(process.env.MUNDI_PLAN_PATH||"reports/agents-plan.json");
  mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(plan,null,2)+"\n");
  console.log("MUNDI "+plan.date+": "+plan.counts.scheduled+" assignments, "+plan.counts.journalistGrounded+" existing journalistic leads, "+plan.counts.journalistNeedsFreshResearch+" must research fresh sources, 0 articles published.");
}
