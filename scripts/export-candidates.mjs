#!/usr/bin/env node
/**
 * Transforme une liste de pistes RSS/Atom non vérifiées en fiches locales.
 * Aucune publication, aucun ajout dans content/publications.json.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

function secureHttps(value) {
  try {
    if (typeof value !== "string") return null;
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch { return null; }
}

export function candidateFromFeed(item) {
  if (!item || typeof item !== "object" ||
      item.reviewStatus !== "candidate_unverified" ||
      typeof item.title !== "string" || !item.title.trim() ||
      typeof item.publisher !== "string" || !item.publisher.trim()) return null;
  const url = secureHttps(item.link);
  if (!url) return null;
  return {
    format: "mundi-candidate-v1",
    reviewStatus: "candidate_unverified",
    headline: item.title.slice(0,220).trim(),
    source: { label: item.publisher.trim(), url },
    topicHint: typeof item.topicHint === "string" ? item.topicHint : "",
    publishedAt: typeof item.publishedAt === "string" && !Number.isNaN(Date.parse(item.publishedAt))
      ? new Date(item.publishedAt).toISOString() : null,
    licenseUrl: secureHttps(item.rightsUrl),
  };
}

export function exportCandidates(data, destination) {
  if (!data || !Array.isArray(data.items)) throw new Error("Invalid editorial inbox");
  mkdirSync(destination,{recursive:true});
  const seen = new Set();
  let count=0;
  for (const item of data.items.slice(0,100)) {
    const candidate = candidateFromFeed(item);
    if (!candidate || seen.has(candidate.source.url)) continue;
    seen.add(candidate.source.url);
    const id = createHash("sha256").update(candidate.source.url).digest("hex").slice(0,20);
    const filename = "mundi-candidat-" + id + ".json";
    writeFileSync(join(destination,filename),JSON.stringify(candidate,null,2)+"\n");
    count++;
  }
  return count;
}

if (process.argv[1] && import.meta.url === new URL("file://"+resolve(process.argv[1])).href) {
  const input = resolve(process.env.MUNDI_INBOX_PATH || "reports/editorial-inbox.json");
  const destination = resolve(process.env.MUNDI_CANDIDATES_DIR || "reports/candidates");
  const data = JSON.parse(readFileSync(input,"utf8"));
  const count = exportCandidates(data,destination);
  console.log(count+" fiche(s) de recherche non vérifiée(s) exportée(s) dans "+destination);
  console.log("Aucune publication automatique.");
}
