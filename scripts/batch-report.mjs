#!/usr/bin/env node
/**
 * MUNDI (#125) — rapport court d'un lot, avant et après déploiement.
 *
 * Pour un lot : doublons bloqués (avec la proposition d'enrichissement), revues demandées, couvertures
 * typographiques, visuels en révision et raison, photos publiées ou protégées, et date de la sélection
 * « Aujourd'hui » qui sera servie. Contrôles déterministes, sans réseau ni appel payant.
 *
 *   node scripts/batch-report.mjs                       # rapports du passage (reports/*.json)
 *   node scripts/batch-report.mjs --replay tests/fixtures/lot-2026-11-26 [--now 2026-11-27T08:00:00+01:00]
 *     rejoue le lot du 26/11 (six passages de publication) deux fois, puis écrit reports/replay-2026-11-26.md
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { insertBatch } from "./catalogue-insert.mjs";
import { collectEditorialImages } from "./collect-editorial-images.mjs";
import { resolveToday } from "../lib/today.ts";

const read = (f, fallback = null) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return fallback; } };

/** Rapport d'un lot à partir du journal d'insertion, du rapport photo et de la sélection résolue. */
export function batchReport({ label, insertion = [], images = null, today = null }) {
  const held = insertion.filter((x) => x.decision === "en attente");
  const review = insertion.filter((x) => x.decision === "inséré, revue demandée");
  const blocked = insertion.filter((x) => x.decision === "bloqué");
  const inserted = insertion.filter((x) => x.decision.startsWith("inséré"));
  const already = insertion.filter((x) => x.decision === "déjà présent");
  const img = images ?? [];
  const photos = {
    added: img.filter((x) => x.status === "added"),
    protected: img.filter((x) => x.status === "protected_by_review"),
    review: img.filter((x) => x.status === "needs_human_review"),
    typographic: img.filter((x) => ["typographic_by_review", "no_licensed_photo", "needs_human_review"].includes(x.status)),
  };
  const lines = [`## MUNDI — rapport du lot ${label}`, ""];
  lines.push(`- Publications insérées : ${inserted.length}${already.length ? ` (relance : ${already.length} déjà présentes, rien de créé)` : ""}`);
  lines.push(`- Doublons bloqués : ${held.length}`);
  for (const h of held) lines.push(`  - \`${h.slug}\` : ${h.reason}${h.proposal ? `. Proposition : ${h.proposal.action} (${h.proposal.newSources.length} source(s) nouvelle(s), chiffres nouveaux : ${h.proposal.newNumbers.join(", ") || "aucun"})` : ""}`);
  if (review.length) lines.push(`- Revues demandées (source commune, angle distinct) : ${review.length}`, ...review.map((r) => `  - \`${r.slug}\` : ${r.reason}`));
  if (blocked.length) lines.push(`- Entrées défectueuses bloquées (le reste du lot a continué) : ${blocked.length}`, ...blocked.map((b) => `  - \`${b.slug ?? "?"}\` : ${b.reason}`));
  if (images) {
    lines.push(`- Photos publiées automatiquement : ${photos.added.length}`, ...photos.added.map((x) => `  - \`${x.slug}\` : ${x.query}`));
    if (photos.protected.length) lines.push(`- Photos validées par la rédaction, protégées : ${photos.protected.length}`);
    lines.push(`- Couvertures typographiques : ${photos.typographic.length}`);
    lines.push(`- Visuels en révision humaine : ${photos.review.length}`,
      ...photos.review.map((x) => `  - \`${x.slug}\` : « ${x.candidate?.title} » (${x.candidate?.conflict ?? "recherche de rubrique, à confirmer"})`));
  } else lines.push("- Photos : collecte faite par un autre passage (editorial-images.yml)");
  if (today) {
    const label = { "a-jour": "sélection de la rédaction du jour", perimee: "sélection périmée, repli sur les plus récentes", "sans-nouveaute": "dernière édition (rien de nouveau)", automatique: "sélection automatique" }[today.state];
    lines.push(`- Aujourd'hui (Paris, ${today.today}) : ${label}, édition du ${today.edition}`,
      ...today.picks.map((p, i) => `  ${i + 1}. \`${p.publication.slug}\` (${p.reason})`));
  }
  return { label, inserted: inserted.map((x) => x.slug), held, review, blocked, already: already.map((x) => x.slug), photos, today, markdown: lines.join("\n") + "\n" };
}

/** Rejoue un lot enregistré : passages de publication dans l'ordre, puis une relance complète. */
export async function replay(dir, { now = new Date("2026-11-27T08:00:00+01:00") } = {}) {
  const base = read(join(dir, "catalogue-avant.json"), []);
  const lots = read(join(dir, "lots.json"), []);
  const photos = read(join(dir, "photos.json"), []);
  const config = read(join(dir, "aujourdhui.json"));
  let catalogue = base;
  const log = [];
  for (const lot of lots) {
    const r = insertBatch(lot.items, catalogue, { at: lot.at });
    catalogue = r.catalogue;
    log.push(...r.log.map((x) => ({ ...x, lot: lot.commit })));
  }
  const rerun = [];
  for (const lot of lots) {
    const r = insertBatch(lot.items, catalogue, { at: "relance" });
    catalogue = r.catalogue;
    rerun.push(...r.log);
  }
  // Photos : la collecte du jour rejouée avec les mêmes résultats de recherche Commons qu'au 26/11,
  // sans les décisions de la rédaction (les règles seules), dans un dossier temporaire.
  const root = mkdtempSync(join(tmpdir(), "mundi-replay-"));
  const day = new Set(lots.flatMap((l) => l.items.map((p) => p.slug)));
  let images = [];
  try {
    const bySlugQuery = new Map(photos.filter((x) => !x.card).map((x) => [x.slug + "|" + x.query, x]));
    let catalogueImages = [];
    // Article par article, pour que la recherche simulée rende la photo trouvée ce jour-là pour cet article.
    for (const p of catalogue.filter((x) => day.has(x.slug) && x.status === "published")) {
      const result = await collectEditorialImages([p], catalogueImages, {
        root, max: 60, reviews: { items: [] }, day: "2026-11-26",
        search: async (query) => {
          const x = bySlugQuery.get(p.slug + "|" + query);
          return x ? { url: x.sourceUrl, src: "https://upload.wikimedia.org/x.jpg", title: x.title, author: x.credit, license: x.license, licenseUrl: x.licenseUrl } : null;
        },
        download: async () => ({ ext: "jpg", buffer: Buffer.alloc(16) }),
        // Rejeu hors ligne : aucun fichier Commons nommé (photos d'institution) n'est téléchargé.
        fetchFile: async () => null,
      });
      catalogueImages = result.images;
      images.push(...result.report);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
  const live = catalogue.filter((p) => p.status === "published");
  const today = resolveToday(live, config, now);
  return { first: batchReport({ label: "du 26/11 (rejeu)", insertion: log, images, today }), rerun: batchReport({ label: "du 26/11 (relance du même lot)", insertion: rerun }), catalogue };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  mkdirSync("reports", { recursive: true });
  let md;
  if (opt("--replay")) {
    const r = await replay(resolve(opt("--replay")), opt("--now") ? { now: new Date(opt("--now")) } : {});
    md = r.first.markdown + "\n" + r.rerun.markdown;
    writeFileSync("reports/replay-2026-11-26.md", md);
  } else {
    const a = read("reports/autopublish.json", {});
    const ins = read("reports/insertion.json", null);
    const publications = read("content/publications.json", []).filter((p) => p.status === "published");
    const today = resolveToday(publications, read("content/aujourdhui.json"), new Date());
    md = batchReport({ label: a.date ?? new Date().toISOString().slice(0, 10), insertion: ins?.log ?? a.insertion ?? [],
      images: existsSync("reports/editorial-images.json") ? read("reports/editorial-images.json") : null, today }).markdown;
    writeFileSync("reports/lot.md", md);
  }
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n", { flag: "a" });
}
