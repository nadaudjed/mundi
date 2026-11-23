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
export function makeDailyPlan({roster,ideas,stock,publications,history={version:1,entries:[]},now}){
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
  const used=new Set(),jobs=[];
  for(const agent of roster.journalists){
    const own=fresh.filter(x=>x.topicHint===agent.topic&&!previous.has("news:"+x.link));
    own.sort((a,b)=>(b.publishedAt||"").localeCompare(a.publishedAt||"")||a.link.localeCompare(b.link));
    const candidate=own.find(x=>!used.has(x.link));
    if(candidate)used.add(candidate.link);
    const previousArticle=candidate?publications.find(p=>(p.sources??[]).some(s=>s.url===candidate.link)):null;
    jobs.push({
      id:hash(today+":"+agent.id),date:today,agentId:agent.id,role:"journalist",topic:agent.topic,
      status:candidate?"candidate_unverified":"blocked_no_fresh_authorized_source",
      action:previousArticle?"investigate_update":"investigate_new",
      previousPublication:previousArticle?.slug??null,
      title:candidate?.title??null,angle:null,
      source:candidate?{label:candidate.publisher,url:candidate.link,publishedAt:candidate.publishedAt}:null,
      recordKey:candidate?"news:"+candidate.link:null,
      sourceCount:candidate?1:0,review:"not_started",published:false
    });
  }
  const rotation=Math.floor(nowMs/86400000)%12;
  const assigned=Array.from({length:8},(_,i)=>roster.professors[(rotation+i)%12]);
  for(const agent of assigned){
    const pool=ideas.items.filter(i=>i.topic===agent.topic&&i.status==="idea_unverified"&&i.approved===false);
    pool.sort((a,b)=>a.id.localeCompare(b.id));
    const unused=pool.filter(i=>!previous.has("lesson:"+i.id));
    const idea=unused.length?unused[Math.floor(nowMs/86400000)%unused.length]:null;
    jobs.push({
      id:hash(today+":"+agent.id),date:today,agentId:agent.id,role:"professor",topic:agent.topic,
      status:idea?"research_required":"blocked_no_unused_lesson",
      action:"prepare_evergreen_lesson",previousPublication:null,
      title:idea?.title??null,angle:idea?.angle??null,
      source:null,recordKey:idea?"lesson:"+idea.id:null,
      sourceCount:0,review:"not_started",published:false
    });
  }
  if(jobs.length!==roster.targetPerDay)throw new Error("Daily target and roster disagree");
  return {
    format:"mundi-daily-agent-plan-v1",date:today,createdAt:date,
    target:roster.targetPerDay,
    notice:"This is a research plan, NOT 20 fact-checked publications. Zero automatic public edits.",
    counts:{
      scheduled:jobs.length,
      journalist:jobs.filter(x=>x.role==="journalist").length,
      professors:jobs.filter(x=>x.role==="professor").length,
      journalistGrounded:jobs.filter(x=>x.role==="journalist"&&x.source).length,
      blocked:jobs.filter(x=>x.status.startsWith("blocked_")).length,
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
  console.log("MUNDI "+plan.date+": "+plan.counts.scheduled+" assignments, "+plan.counts.journalistGrounded+" journalism leads, "+plan.counts.blocked+" blocked; 0 articles published.");
}
