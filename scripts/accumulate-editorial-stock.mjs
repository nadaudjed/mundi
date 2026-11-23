#!/usr/bin/env node
/**
 * MUNDI private candidate archive: merge research metadata across daily runs.
 * This NEVER verifies or publishes an article. No article bodies, images or media.
 * Run against a detached editorial-stock worktree, never content/publications.json.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const FORMAT = "mundi-candidate-stock-v1";
export const LIMIT = 12000;
export const RETAIN_DAYS = 365;
const SECOND = 86400000;

function safeUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const u=new URL(value);
    if(u.protocol!=="https:"||u.username||u.password) return null;
    u.hash="";
    return u.href;
  } catch { return null; }
}
function short(value,max) {
  return typeof value==="string" ? value.replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max) : "";
}
function iso(value) {
  if(typeof value!=="string") return null;
  const t=Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
function safeCandidate(item,when) {
  if(!item||typeof item!=="object"||item.reviewStatus!=="candidate_unverified")return null;
  const link=safeUrl(item.link);
  const title=short(item.title,220);
  const publisher=short(item.publisher,110);
  const sourceId=short(item.sourceId,90);
  if(!link||!title||!publisher||!sourceId)return null;
  return {
    link,title,publisher,sourceId,topicHint:short(item.topicHint,70),
    publishedAt:iso(item.publishedAt),
    rightsUrl:safeUrl(item.rightsUrl),
    status:"candidate_unverified",
    firstSeenAt:when,lastSeenAt:when
  };
}
function validateStock(existing) {
  if(!existing||typeof existing!=="object"||existing.format!==FORMAT||!Array.isArray(existing.items))
    throw new Error("Existing stock is malformed; refusing to overwrite");
  if(existing.items.length>LIMIT)throw new Error("Existing archive exceeds maximum size");
  for(const item of existing.items) {
    if(!safeUrl(item.link)||!item.firstSeenAt||!iso(item.lastSeenAt)||item.status!=="candidate_unverified")
      throw new Error("Existing archive contains invalid entries; refusing to overwrite");
  }
}
export function accumulateStock(previous,research,now="2026-11-23T12:00:00.000Z") {
  const current=iso(now);
  if(!current)throw new Error("Invalid clock");
  if(!research||typeof research!=="object"||!Array.isArray(research.items))
    throw new Error("Invalid daily inbox");
  if(previous!==null)validateStock(previous);
  const limitTime=Date.parse(current)-RETAIN_DAYS*SECOND;
  const store=new Map();
  for(const item of previous?.items??[]) {
    if(Date.parse(item.lastSeenAt)<limitTime)continue;
    store.set(item.link,{...item});
  }
  let newCount=0,refreshedCount=0,invalidCount=0;
  for(const item of research.items.slice(0,500)) {
    const c=safeCandidate(item,current);
    if(!c){invalidCount++;continue;}
    const old=store.get(c.link);
    if(old) {
      store.set(c.link,{...old,...c,firstSeenAt:old.firstSeenAt});
      refreshedCount++;
    } else {
      store.set(c.link,c);
      newCount++;
    }
  }
  const items=[...store.values()]
    .sort((a,b)=>b.lastSeenAt.localeCompare(a.lastSeenAt)||a.link.localeCompare(b.link))
    .slice(0,LIMIT);
  return {
    format:FORMAT,updatedAt:current,
    disclaimer:"Métadonnées de pistes NON vérifiées. Ne sont pas des articles ni des publications MUNDI.",
    count:items.length,
    latestCollection:{
      at:iso(research.generatedAt)||current,
      collected:research.items.length,
      newCount,refreshedCount,invalidCount,
      errors:Array.isArray(research.errors)?research.errors.length:0,
      sourceHealth:Array.isArray(research.sourceHealth)?research.sourceHealth.map(s=>({
        sourceId:short(s?.sourceId,90),status:short(s?.status,40),count:Number.isInteger(s?.count)?s.count:0,
        ...(s?.error?{error:short(s.error,200)}:{})
      })).slice(0,60):[]
    },
    items
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const infile=resolve(process.env.MUNDI_INBOX_PATH||"reports/editorial-inbox.json");
  const outfile=resolve(process.env.MUNDI_STOCK_PATH||"reports/editorial-stock.json");
  const research=JSON.parse(readFileSync(infile,"utf8"));
  const previous=existsSync(outfile)?JSON.parse(readFileSync(outfile,"utf8")):null;
  const stock=accumulateStock(previous,research,new Date().toISOString());
  mkdirSync(dirname(outfile),{recursive:true});
  writeFileSync(outfile,JSON.stringify(stock,null,2)+"\n","utf8");
  console.log("Private research stock:",stock.count,"unverified metadata candidates; new:",stock.latestCollection.newCount);
  console.log("No publication, editorial approval, or article body created.");
}
