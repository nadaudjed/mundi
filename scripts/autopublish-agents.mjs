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
 * Plafond quotidien MUNDI_PUBLISH_PER_DAY (défaut 24) et interrupteur d'urgence : variable MUNDI_AUTOPUBLISH=off.
 * La publication est signalée sur le site comme vérifiée par l'IA, sans relecture humaine.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { publishableCards, publishableFlashcards } from "./data-cards-check.mjs";

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
  if (output?.assessment?.status !== "machine_checked_pending_policy" || output?.checker?.verdict !== "pass" || output?.checker?.independentlyChecked !== true) reasons.push("non validé par le vérificateur");
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

const BOT_BLOCK = new Set([401, 403, 405, 406, 429]);
const norm = (u) => { try { const x = new URL(u); x.hash = ""; return x.href.replace(/\/$/, ""); } catch { return String(u); } };
async function probe(url, fetcher, userAgent) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetcher(url, { method: "GET", redirect: "follow", signal: ctl.signal,
      headers: { "User-Agent": userAgent, Accept: "text/html,application/pdf,*/*", "Accept-Language": "fr,en;q=0.8" } });
    return Number.isInteger(r.status) ? r.status : (r.ok ? 200 : 404);
  } catch {
    return 0;
  } finally {
    clearTimeout(t);
  }
}
/**
 * Contrôle indépendant de l'IA. Chaque lien doit répondre (2xx après redirections).
 * Exception limitée : un site qui refuse les robots (401/403/405/406/429) n'est accepté que si
 * l'adresse exacte a été renvoyée par le moteur de recherche pendant la rédaction ou la vérification
 * (preuve qu'elle existe), et seulement si au moins un autre lien du dossier répond réellement.
 * Une page absente (404/410), une erreur serveur ou un domaine injoignable restent bloquants.
 */
export async function checkLinks(urls, { fetcher = fetch, searchedUrls = [] } = {}) {
  const searched = new Set(searchedUrls.map(norm));
  const bad = [], blocked = [], ok = [];
  for (const url of urls) {
    let status = await probe(url, fetcher, "MUNDI-link-check/1.1 (+https://mundiapptest.netlify.app)");
    if (!(status >= 200 && status < 300) && (status === 0 || BOT_BLOCK.has(status)))
      status = await probe(url, fetcher, "Mozilla/5.0 (compatible; MUNDI-link-check/1.1; +https://mundiapptest.netlify.app)");
    if (status >= 200 && status < 300) ok.push(url);
    else if (BOT_BLOCK.has(status) && searched.has(norm(url))) blocked.push(url);
    else bad.push(url + (status ? " (HTTP " + status + ")" : " (injoignable)"));
  }
  if (!ok.length && blocked.length) bad.push("aucun lien ne répond directement");
  return { bad, blocked, ok };
}
/** Compatibilité : liste des liens refusés sans exception de recherche. */
export async function unreachable(urls, fetcher = fetch) {
  return (await checkLinks(urls, { fetcher })).bad.map((u) => u.replace(/ \((HTTP \d+|injoignable)\)$/, ""));
}

/**
 * Un article reçoit-il une série de cartes « Données » ? Le plan du jour le décide (dataCards) pour
 * environ un article sur trois. Pour les brouillons plus anciens, sans cette indication, un tirage
 * stable sur le titre garde la même proportion.
 */
export function dataCardsAllowed(output) {
  if (typeof output?.dataCardsAllowed === "boolean") return output.dataCardsAllowed;
  const title = String(output?.draft?.title ?? "");
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h % 3 === 0;
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
    // "actualite" (dated event), "concept" or "recit"; eventDate is the day the news happened or was announced.
    ...(output.kind ? { kind: output.kind } : output.role ? { kind: output.role === "journalist" ? "actualite" : "concept" } : {}),
    ...(output.role === "journalist" && /^\d{4}-\d{2}-\d{2}$/.test(d.eventDate ?? "") ? { eventDate: d.eventDate } : {}),
    // Cartes « Données » : seulement pour les articles prévus (environ un sur trois, pour varier le fil)
    // et si elles respectent le format exigé par le site (sinon retirées, l'article reste publiable).
    ...(dataCardsAllowed(output) && publishableCards(d) ? { dataCards: publishableCards(d) } : {}),
    // Cartes mémoire de la rubrique Réviser, tirées du texte publié et contrôlées par le vérificateur.
    ...(publishableFlashcards(d) ? { flashcards: publishableFlashcards(d) } : {}),
  };
}

export async function autopublish(results, existing, { enabled = true, max = 2, fetcher = fetch } = {}) {
  const decisions = [];
  const published = [];
  if (!enabled) return { published, decisions: [{ id: null, decision: "désactivé (MUNDI_AUTOPUBLISH=off)" }] };
  // The limit is per UTC editorial day, not per workflow run. Manual re-runs and
  // schedule/push events cannot publish another full quota on the same date.
  const publishedToday = existing.filter(p =>
    p?.aiVerified === true && p?.status === "published" && p?.publishedAt === results?.date
  ).length;
  const remaining = Math.max(0, max - publishedToday);
  for (const output of results?.outputs ?? []) {
    if (published.length >= remaining) {
      decisions.push({ id: output.id, decision: "plafond quotidien atteint" });
      continue;
    }
    const reasons = blockers(output, [...existing, ...published]);
    let links = null;
    if (!reasons.length) {
      links = await checkLinks(output.draft.sources.map((s) => s.url), { fetcher, searchedUrls: output.searchedUrls ?? [] });
      if (links.bad.length) reasons.push("liens injoignables : " + links.bad.join(", "));
    }
    if (reasons.length) {
      decisions.push({ id: output.id, topic: output.topic, decision: "non publié", reasons });
      continue;
    }
    const p = toPublication(output, results.date);
    published.push(p);
    decisions.push({ id: output.id, topic: output.topic, decision: "publié", slug: p.slug, robotBlockedLinks: links?.blocked ?? [] });
  }
  return { published, decisions };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const results = JSON.parse(readFileSync(resolve(process.env.MUNDI_AGENT_REPORT || "reports/agents-results.json"), "utf8"));
  const file = resolve("content/publications.json");
  const existing = JSON.parse(readFileSync(file, "utf8"));
  const enabled = (process.env.MUNDI_AUTOPUBLISH || "on").toLowerCase() !== "off";
  const max = Math.max(0, Math.min(48, Number.parseInt(process.env.MUNDI_PUBLISH_PER_DAY || "48", 10) || 0));
  const { published, decisions } = await autopublish(results, existing, { enabled, max });
  for (const d of decisions) console.log("MUNDI autopublish", d.id ?? "", d.topic ?? "", "—", d.decision, d.slug ?? "", (d.reasons ?? []).join(" ; "));
  if (published.length) writeFileSync(file, JSON.stringify([...published, ...existing], null, 2) + "\n");
  writeFileSync(resolve("reports/autopublish.json"), JSON.stringify({ date: results.date, published: published.map((p) => p.slug), decisions }, null, 2) + "\n");
  console.log("MUNDI autopublish: " + published.length + " publication(s) ajoutée(s).");
}
