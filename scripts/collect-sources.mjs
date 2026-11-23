#!/usr/bin/env node
/** Veille RSS interne, métadonnées seulement. Aucune publication automatique. */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
const MAX_BYTES = 2_000_000;
const MAX_ITEMS = 30;
export function plain(value) {
  return (value || "").replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i,"$1")
    .replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<")
    .replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'")
    .replace(/\s+/g," ").trim();
}
export function tag(node,name) {
  const match = node.match(new RegExp("<"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+name+"\\s*>","i"));
  return match ? plain(match[1]) : "";
}
export function parseFeed(xml,feed) {
  const found = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item\s*>/gi)].slice(0,MAX_ITEMS);
  return found.flatMap(m => {
    const node = m[1], title = tag(node,"title").slice(0,220), url = tag(node,"link");
    let link;
    try {
      const candidate = new URL(url);
      const sourceHost = new URL(feed.feedUrl).hostname.replace(/^www\./,"");
      if (candidate.protocol !== "https:" || candidate.hostname.replace(/^www\./,"") !== sourceHost) return [];
      candidate.hash = "";
      link = candidate.href;
    } catch { return []; }
    if (!title || !link) return [];
    const date = tag(node,"pubDate") || tag(node,"dc:date");
    return [{
      id:createHash("sha256").update(link).digest("hex").slice(0,20),
      title,link,publisher:feed.publisher,sourceId:feed.id,topicHint:feed.topic,
      publishedAt:date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : null,
      reviewStatus:"candidate_unverified"
    }];
  });
}
export async function collectFeeds(feeds) {
  const items=[],errors=[];
  for(const feed of feeds.filter(f=>f.enabled)){
    try{
      const url = new URL(feed.feedUrl);
      if(url.protocol!=="https:" || !["www.lemonde.fr","www.rfi.fr"].includes(url.hostname)) throw new Error("feed host not approved");
      const response = await fetch(url,{signal:AbortSignal.timeout(12000),redirect:"error",
        headers:{"user-agent":"MUNDI-Editorial-Research/0.1 (metadata only)","accept":"application/rss+xml,application/xml,text/xml"}});
      if(!response.ok) throw new Error("HTTP "+response.status);
      if(Number(response.headers.get("content-length"))>MAX_BYTES) throw new Error("feed too large");
      const xml=await response.text();
      if(Buffer.byteLength(xml,"utf8")>MAX_BYTES) throw new Error("feed too large");
      if(!/<rss\b|<rdf:RDF\b/i.test(xml)) throw new Error("not an RSS feed");
      items.push(...parseFeed(xml,feed));
    }catch(e){errors.push({sourceId:feed.id,error:String(e.message||e).slice(0,200)});}
  }
  const unique=[...new Map(items.map(i=>[i.link,i])).values()]
    .sort((a,b)=>(b.publishedAt||"").localeCompare(a.publishedAt||"")).slice(0,100);
  return {generatedAt:new Date().toISOString(),
    disclaimer:"Candidats RSS non vérifiés. Ne pas publier sans revue humaine.",
    count:unique.length,items:unique,errors};
}
if(process.argv[1] && import.meta.url===new URL("file://"+resolve(process.argv[1])).href){
  const feeds=JSON.parse(readFileSync(resolve("content/sources.json"),"utf8"));
  if(!Array.isArray(feeds)) throw new Error("sources.json must be an array");
  const result=await collectFeeds(feeds);
  const path=resolve(process.env.MUNDI_INBOX_PATH||"reports/editorial-inbox.json");
  mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,JSON.stringify(result,null,2)+"\n");
  console.log("Collecte: "+result.count+" titres candidats; "+result.errors.length+" flux en erreur. Fichier: "+path);
  if(!result.count) process.exitCode=1;
}
