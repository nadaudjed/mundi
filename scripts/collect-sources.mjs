#!/usr/bin/env node
/**
 * Veille éditoriale : uniquement titres, liens, dates et provenance.
 * Flux RSS 2.0 / Atom. Aucun article public, aucune image tierce.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";

const MAX_BYTES = 2_000_000;
const MAX_ITEMS = 30;
const FEED_HOSTS = new Set(["ec.europa.eu", "www.lemonde.fr", "www.rfi.fr"]);

export function plain(value) {
  return (value || "").replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i, "$1")
    .replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&#(\d+);/g, (_,n) => String.fromCodePoint(Math.min(1114111, Number(n))))
    .replace(/\s+/g," ").trim();
}
export function tag(node, name) {
  const match = node.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + name + "\\s*>","i"));
  return match ? plain(match[1]) : "";
}
function attribute(raw, name) {
  const match = new RegExp(name + "\\s*=\\s*(['\"])(.*?)\\1", "i").exec(raw);
  return match ? plain(match[2]) : "";
}
function canonicalLink(raw, feed) {
  try {
    const url = new URL(raw,feed.feedUrl);
    const sourceHost = new URL(feed.feedUrl).hostname.replace(/^www\./,"");
    if (url.protocol !== "https:" || url.hostname.replace(/^www\./,"") !== sourceHost) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}
function atomLink(entry) {
  const links = [...entry.matchAll(/<link\b([^>]*?)\/?>/gi)].map(m=>m[1]);
  const primary = links.find(attrs => {
    const rel = attribute(attrs,"rel");
    return !rel || rel === "alternate";
  });
  return primary ? attribute(primary,"href") : "";
}
function candidate(node, feed, atom = false) {
  const title = tag(node,"title").slice(0,220);
  const link = canonicalLink(atom ? atomLink(node) : tag(node,"link"), feed);
  if (!title || !link) return null;
  const when = atom ? (tag(node,"published") || tag(node,"updated")) : (tag(node,"pubDate") || tag(node,"dc:date"));
  return {
    id:createHash("sha256").update(link).digest("hex").slice(0,20),
    title,link,publisher:feed.publisher,sourceId:feed.id,topicHint:feed.topic,
    rightsUrl:feed.rightsUrl || null,
    publishedAt:when && !Number.isNaN(Date.parse(when)) ? new Date(when).toISOString() : null,
    reviewStatus:"candidate_unverified",
  };
}
/** Parser les deux formats d'actualité sans intégrer les textes complets. */
export function parseFeed(xml, feed) {
  const atom = /<feed(?:\s|>)/i.test(xml) && /<entry(?:\s|>)/i.test(xml);
  const pattern = atom ? /<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry\s*>/gi
                       : /<item(?:\s[^>]*)?>([\s\S]*?)<\/item\s*>/gi;
  return [...xml.matchAll(pattern)].slice(0, MAX_ITEMS)
    .map(m => candidate(m[1],feed,atom)).filter(Boolean);
}
/** Sélection stricte : feed activé ET permission de réutiliser les métadonnées vérifiée. */
export function authorizedFeeds(feeds) {
  return feeds.filter(f => f.enabled === true &&
    f.rightsStatus === "approved_metadata_collection" &&
    typeof f.rightsUrl === "string" && f.rightsUrl.startsWith("https://"));
}
export async function collectFeeds(feeds, fetcher = fetch) {
  const items = [], errors = [], sourceHealth = [];
  const eligible = authorizedFeeds(feeds);
  for (const rejected of feeds.filter(f => f.enabled === true && !eligible.includes(f))) {
    const error = "Source activée sans droits de collecte des métadonnées documentés.";
    errors.push({ sourceId: rejected.id, error });
    sourceHealth.push({sourceId:rejected.id, publisher:rejected.publisher, status:"rights_blocked", count:0, error});
  }
  for (const feed of eligible) {
    try {
      const url = new URL(feed.feedUrl);
      if (url.protocol !== "https:" || !FEED_HOSTS.has(url.hostname)) throw new Error("feed host not approved");
      const response = await fetcher(url,{
        signal:AbortSignal.timeout(12000),redirect:"error",
        headers:{"user-agent":"MUNDI-Editorial-Research/0.1 (metadata only)",
          "accept":"application/atom+xml,application/rss+xml,application/xml,text/xml"}
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      if (Number(response.headers.get("content-length")) > MAX_BYTES) throw new Error("feed too large");
      const xml = await response.text();
      if (Buffer.byteLength(xml,"utf8") > MAX_BYTES) throw new Error("feed too large");
      if (!/<rss\b|<rdf:RDF\b|<feed(?:\s|>)/i.test(xml)) throw new Error("not a recognized RSS or Atom feed");
      const parsed = parseFeed(xml,feed);
      items.push(...parsed);
      sourceHealth.push({sourceId:feed.id,publisher:feed.publisher,status:parsed.length ? "ok" : "empty",count:parsed.length,error:null});
    } catch(e) {
      const error=String(e.message||e).slice(0,200);
      errors.push({sourceId:feed.id,error});
      sourceHealth.push({sourceId:feed.id,publisher:feed.publisher,status:"error",count:0,error});
    }
  }
  const unique = [...new Map(items.map(i=>[i.link,i])).values()]
    .sort((a,b)=>(b.publishedAt||"").localeCompare(a.publishedAt||"")).slice(0,100);
  return {generatedAt:new Date().toISOString(),
    disclaimer:"Candidats RSS/Atom non vérifiés. Ne pas publier sans revue humaine.",
    count:unique.length,items:unique,errors,sourceHealth};
}
if (process.argv[1] && import.meta.url === new URL("file://"+resolve(process.argv[1])).href) {
  const feeds=JSON.parse(readFileSync(resolve("content/sources.json"),"utf8"));
  if (!Array.isArray(feeds)) throw new Error("sources.json must be an array");
  const result=await collectFeeds(feeds);
  const path=resolve(process.env.MUNDI_INBOX_PATH||"reports/editorial-inbox.json");
  mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,JSON.stringify(result,null,2)+"\n");
  console.log("Collecte: "+result.count+" titres candidats; "+result.errors.length+" flux en erreur. Fichier: "+path);
  if (!result.count) process.exitCode=1;
}
