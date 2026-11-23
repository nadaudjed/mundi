#!/usr/bin/env node
/**
 * MUNDI editorial pilot — structural safety of non-public review packs.
 * This script CANNOT verify whether news claims are true.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

function isText(x, min = 1) { return typeof x === "string" && x.trim().length >= min; }
function isHttps(x) {
  try {
    const url = new URL(x);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

export function validateReviewDraft(doc) {
  const errors = [];
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return ["Review draft must be a JSON object"];
  if (doc.status !== "draft" || doc.reviewedBy !== "") errors.push("Review must remain an unapproved draft");
  if (doc.publishedAt !== null || doc.updatedAt !== null) errors.push("Review pack must not imply an actual MUNDI publication date");
  if (doc.editorialNotes?.visibility !== "internal_review_only" || doc.editorialNotes?.approvalRequired !== true)
    errors.push("Missing internal-only visibility and explicit editorial approval gate");
  if (!isText(doc.slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.slug)) errors.push("Invalid slug");
  if (!isText(doc.title, 12) || !isText(doc.summary, 30)) errors.push("Title/summary too short");
  if (!Array.isArray(doc.keyPoints) || doc.keyPoints.length !== 3 || !doc.keyPoints.every(x => isText(x, 12))) errors.push("Exactly three meaningful key points needed");
  if (!Array.isArray(doc.sections) || !doc.sections.length ||
      !doc.sections.every(s => s && ["fait", "analyse", "hypothese"].includes(s.kind) && isText(s.heading) && isText(s.text, 30)))
    errors.push("Missing or invalid editorial sections");
  if (!Array.isArray(doc.sources) || doc.sources.length < 2 ||
      !doc.sources.every(s => s && isText(s.label, 3) && isHttps(s.url)))
    errors.push("At least two attributed HTTPS sources required");
  if (doc.origin?.reviewStatus !== "candidate_unverified") errors.push("Original candidate provenance must remain explicitly unverified");
  return errors;
}

if (process.argv[1] && import.meta.url === new URL("file://" + resolve(process.argv[1])).href) {
  const base = resolve("editorial/reviews");
  const dirs = readdirSync(base, { withFileTypes:true }).filter(x=>x.isDirectory());
  let count = 0, failed = false;
  for (const dir of dirs) {
    let parsed;
    try { parsed = JSON.parse(readFileSync(join(base, dir.name, "draft.json"), "utf8")); }
    catch (e) { console.error("Invalid review file in " + dir.name + ": " + String(e)); failed = true; continue; }
    const errors = validateReviewDraft(parsed);
    if (errors.length) { console.error("Review " + dir.name + ": " + errors.join("; ")); failed = true; }
    else count++;
  }
  if (failed) process.exitCode = 1;
  else console.log("Validated " + count + " internal review draft(s). This does not approve factual accuracy or publication.");
}
