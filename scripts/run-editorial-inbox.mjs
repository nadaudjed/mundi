#!/usr/bin/env node
/**
 * One-click internal newsroom review. No publication, no changes to articles.
 * Disabled sources are not fetched. Empty feeds generate an explicit report.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { collectFeeds, authorizedFeeds } from "./collect-sources.mjs";
import { makeReport } from "./render-editorial-report.mjs";

const feeds = JSON.parse(readFileSync(resolve(process.env.MUNDI_SOURCES_PATH || "content/sources.json"),"utf8"));
if (!Array.isArray(feeds)) throw new Error("Source catalogue must be an array");
const enabled = authorizedFeeds(feeds);
const result = enabled.length ? await collectFeeds(feeds) : {
  generatedAt: new Date().toISOString(),
  disclaimer: "No sources are authorized/enabled. No headlines were collected, and nothing was published.",
  count: 0,
  items: [],
  errors: [{
    sourceId: "permissions",
    error: "Aucune source RSS activée : contrôler les droits et autorisations avant d'activer la veille."
  }]
};
const reportDir = resolve(process.env.MUNDI_REPORT_DIR || "reports");
mkdirSync(reportDir,{recursive:true});
writeFileSync(resolve(reportDir, "editorial-inbox.json"),JSON.stringify(result,null,2)+"\n");
writeFileSync(resolve(reportDir, "editorial-inbox.html"),makeReport(result));
console.log("Internal newsroom: "+result.count+" candidate metadata items; "+result.errors.length+" notices; "+enabled.length+" enabled feeds.");
console.log("No content was added to content/publications.json. No publication took place.");
