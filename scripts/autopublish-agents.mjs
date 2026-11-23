#!/usr/bin/env node
/**
 * MUNDI V2 (#43) — publication automatique des brouillons d'agents, voulue par le fondateur.
 *
 * Ne publie qu'un brouillon qui a passé TOUS les contrôles :
 * - statut `machine_checked_pending_policy` (validation déterministe + vérificateur IA indépendant :
 *   chaque affirmation étayée, verdict « pass », règles renforcées sur les sujets sensibles) ;
 * - tous les sujets sont admis, y compris sensibles, tant que c'est sourcé (décision du fondateur, 23/11/2026) ;
 * - au moins deux organismes sources différents, et chaque lien répond réellement (contrôle par le script,
 *   sans faire confiance à l'IA) ;
 * - pas de doublon (même titre ou mêmes sources qu'une publication existante).
 * Plafond quotidien (défaut 2) et interrupteur d'urgence : variable MUNDI_AUTOPUBLISH=off.
 * La publication est signalée sur le site comme vérifiée par l'IA, sans relecture humaine.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const AI_REVIEWER = "Vérificateur IA MUNDI (sans relecture humaine)";

const text = (v, n = 1) => typeof v === "string" && v.trim().length >= n;
const https = (u) => {
  try {
    const x = new URL(u);
    return x.protocol === "https:" && !x.username && !x.password && !["localhost", "example.com", "example.org", "example.net"].includes(x.hostname);
  } catch {
    return false;
  }
};
const organisation = (u) => new URL(u).hostname.toLowerCase().split(".").slice(-2).join(".");

export function slugify(title) {
  const full = String(title)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return full.length <= 80 ? full : full.slice(0, 81).replace(/-[^-]*$/, "");
}

/** Raisons de ne pas publier ce résultat d'agent (tableau vide = publiable, sous réserve des liens). */
export function blockers(output, existing) {
  const reasons = [];
  const d = output?.draft;
  if (output?.assessment?.status !== "machine_checked_pending_policy") reasons.push("non validé par le vérificateur");
  if (!d) return [...reasons, "brouillon absent"];
  if ((output.checker?.uncertainties ?? []).length > 5) reasons.push("trop d'incertitudes relevées");
  if (!text(d.title, 12) || !text(d.summary, 30)) reasons.push("titre ou résumé trop court");
  if (!Array.isArray(d.keyPoints) || d.keyPoints.length !== 3 || !d.keyPoints.every((k) => text(k, 12))) reasons.push("trois idées clés requises");
  const sections = Array.isArray(d.sections) ? d.sections : [];
  if (sections.length < 2 || !sections.every((s) => ["fait", "analyse", "hypothese"].includes(s?.kind) && text(s?.heading) && text(s?.text, 30)))
    reasons.push("sections invalides");
  const sources = Array.isArray(d.sources) ? d.sources : [];
  if (sources.length < 2 || !sources.every((s) => text(s?.label, 3) && https(s?.url))) reasons.push("sources invalides");
  else if (new Set(sources.map((s) => organisation(s.url))).size < 2) reasons.push("moins de deux organismes sources");
  const slug = slugify(d.title ?? "");
  if (!slug) reasons.push("titre inutilisable");
  const urls = sources.map((s) => s?.url).sort().join(" ");
  if (existing.some((p) => p.title === d.title || p.slug === slug || p.sources.map((s) => s.url).sort().join(" ") === urls))
    reasons.push("doublon d'une publication existante");
  return reasons;
}

/** Contrôle indépendant de l'IA : chaque lien doit répondre (2xx après redirections). */
export async function unreachable(urls, fetcher = fetch) {
  const bad = [];
  for (const url of urls) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetcher(url, { method: "GET", redirect: "follow", signal: ctl.signal, headers: { "User-Agent": "MUNDI-link-check/1.0", Accept: "text/html,application/pdf,*/*" } });
      if (!r.ok) bad.push(url);
    } catch {
      bad.push(url);
    } finally {
      clearTimeout(t);
    }
  }
  return bad;
}

export function toPublication(output, date) {
  const d = output.draft;
  return {
    slug: slugify(d.title),
    title: d.title.trim(),
    summary: d.summary.trim(),
    topic: d.topic,
    publishedAt: date,
    updatedAt: date,
    status: "published",
    reviewedBy: AI_REVIEWER,
    aiVerified: true,
    keyPoints: d.keyPoints.map((k) => k.trim()),
    sections: d.sections.map((s) => ({ kind: s.kind, heading: s.heading.trim(), text: s.text.trim() })),
    sources: d.sources.map((s) => ({ label: s.label.trim(), url: s.url })),
  };
}

export async function autopublish(results, existing, { enabled = true, max = 2, fetcher = fetch } = {}) {
  const decisions = [];
  const published = [];
  if (!enabled) return { published, decisions: [{ id: null, decision: "désactivé (MUNDI_AUTOPUBLISH=off)" }] };
  for (const output of results?.outputs ?? []) {
    if (published.length >= max) {
      decisions.push({ id: output.id, decision: "plafond quotidien atteint" });
      continue;
    }
    const reasons = blockers(output, [...existing, ...published]);
    if (!reasons.length) {
      const bad = await unreachable(output.draft.sources.map((s) => s.url), fetcher);
      if (bad.length) reasons.push("liens injoignables : " + bad.join(", "));
    }
    if (reasons.length) {
      decisions.push({ id: output.id, topic: output.topic, decision: "non publié", reasons });
      continue;
    }
    const p = toPublication(output, results.date);
    published.push(p);
    decisions.push({ id: output.id, topic: output.topic, decision: "publié", slug: p.slug });
  }
  return { published, decisions };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const results = JSON.parse(readFileSync(resolve(process.env.MUNDI_AGENT_REPORT || "reports/agents-results.json"), "utf8"));
  const file = resolve("content/publications.json");
  const existing = JSON.parse(readFileSync(file, "utf8"));
  const enabled = (process.env.MUNDI_AUTOPUBLISH || "on").toLowerCase() !== "off";
  const max = Math.max(0, Math.min(5, Number.parseInt(process.env.MUNDI_AUTOPUBLISH_MAX || "2", 10) || 0));
  const { published, decisions } = await autopublish(results, existing, { enabled, max });
  for (const d of decisions) console.log("MUNDI autopublish", d.id ?? "", d.topic ?? "", "—", d.decision, d.slug ?? "", (d.reasons ?? []).join(" ; "));
  if (published.length) writeFileSync(file, JSON.stringify([...published, ...existing], null, 2) + "\n");
  writeFileSync(resolve("reports/autopublish.json"), JSON.stringify({ date: results.date, published: published.map((p) => p.slug), decisions }, null, 2) + "\n");
  console.log("MUNDI autopublish: " + published.length + " publication(s) ajoutée(s).");
}
