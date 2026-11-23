import { readFileSync } from "node:fs";

const list = JSON.parse(readFileSync(new URL("../content/publications.json", import.meta.url), "utf8"));
const allowed = new Set(["geopolitique","economie","finance","industrie","materiaux-critiques","energie","recyclage","environnement","technologie","entreprises","afrique","sciences-societe"]);
if (!Array.isArray(list)) throw new Error("publications.json must be an array");
const seen = new Set();
let failed = false;
for (const [index, p] of list.entries()) {
  const errors = [];
  const isText = (v, n = 1) => typeof v === "string" && v.trim().length >= n;
  const isDate = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
  const isSource = s => {
    if (!s || !isText(s.label, 3) || !isText(s.url)) return false;
    try { const u = new URL(s.url); return u.protocol === "https:" && !["example.com","example.org","example.net","localhost"].includes(u.hostname); } catch { return false; }
  };
  if (!p || typeof p !== "object") { console.error("Entry " + index + ": invalid entry"); failed = true; continue; }
  // A withdrawn article stays in the file (audit trail, duplicate guard) but is never shown on the site.
  if (p.status === "withdrawn") {
    if (!isText(p.slug) || seen.has(p.slug) || !isDate(p.withdrawnAt) || !isText(p.withdrawalReason, 10)) { console.error("Withdrawn entry " + index + ": slug, withdrawnAt and withdrawalReason required"); failed = true; }
    seen.add(p.slug);
    continue;
  }
  if (!isText(p.slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) errors.push("invalid slug");
  if (seen.has(p.slug)) errors.push("duplicate slug");
  seen.add(p.slug);
  if (!isText(p.title, 12) || !isText(p.summary, 30)) errors.push("title or summary too short");
  if (!allowed.has(p.topic)) errors.push("unknown topic");
  if (p.status !== "published" || !isText(p.reviewedBy, 3)) errors.push("publication not editorially approved");
  if (!isDate(p.publishedAt) || !isDate(p.updatedAt) || p.updatedAt < p.publishedAt) errors.push("invalid dates");
  if (!Array.isArray(p.keyPoints) || p.keyPoints.length !== 3 || !p.keyPoints.every(v => isText(v,12))) errors.push("three substantial key points required");
  if (!Array.isArray(p.sections) || !p.sections.length || !p.sections.every(s => s && ["fait","analyse","hypothese"].includes(s.kind) && isText(s.heading) && isText(s.text,30))) errors.push("invalid sections");
  if (!Array.isArray(p.sources) || p.sources.length < 2 || !p.sources.every(isSource)) errors.push("at least two HTTPS sources required");
  if (p.corrections !== undefined && (!Array.isArray(p.corrections) || !p.corrections.every(c => c && isDate(c.date) && isText(c.text, 10)))) errors.push("invalid corrections");
  if (errors.length) { failed = true; console.error("Publication " + index + " (" + p.slug + "): " + errors.join(", ")); }
}
if (failed) process.exitCode = 1;
else console.log("Editorial format validated: " + list.length + " publication(s). This does not verify factual accuracy.");
