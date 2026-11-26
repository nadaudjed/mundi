#!/usr/bin/env node
/**
 * MUNDI (#125) — insertion dans le catalogue, point de passage unique de toute nouvelle publication.
 *
 * Toutes les voies d'écriture automatique (tâches Claude Max via max-publish.yml, rédaction API via
 * agent-newsroom.yml) déposent leurs publications ici au lieu d'écrire content/publications.json
 * elles-mêmes. Le même contrôle (scripts/duplicate-guard.mjs) s'applique :
 * - à l'intérieur du lot (deux brouillons du même lot sur le même fait) ;
 * - contre le dernier catalogue, publications retirées comprises (un doublon retiré ne revient pas) ;
 * - contre les lots concurrents : le workflow relance l'insertion sur le main le plus récent juste
 *   avant d'écrire, si bien qu'un lot publié entre-temps est comparé à son tour.
 * Verdicts : « inséré », « en attente » (même décision et même fait : rien n'est publié, une proposition
 * d'enrichissement de l'article existant est faite), « inséré, revue demandée » (source commune, angle
 * distinct) et « déjà présent » (relance du même lot : rien n'est créé). Une entrée défectueuse est
 * bloquée seule, le reste du lot continue. Chaque décision est journalisée avec les identifiants comparés.
 * Fonctions pures ; le CLI lit et écrit les fichiers.
 *
 *   node scripts/catalogue-insert.mjs <lot.json> [--catalogue content/publications.json] [--report reports/insertion.json]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { duplicateCheck, normalizeSourceUrl, salientNumbers } from "./duplicate-guard.mjs";

const sourceKey = (p) => (p?.sources ?? []).map((s) => normalizeSourceUrl(s?.url)).sort().join(" ");

/** Ce que le brouillon retenu apporterait à l'article existant : sources et chiffres absents de celui-ci. */
export function enrichmentProposal(item, target) {
  const have = new Set((target?.sources ?? []).map((s) => normalizeSourceUrl(s?.url)));
  const numbers = salientNumbers(target);
  return {
    target: target?.slug,
    newSources: (item?.sources ?? []).filter((s) => !have.has(normalizeSourceUrl(s?.url))),
    newNumbers: [...salientNumbers(item)].filter((n) => !numbers.has(n)),
    candidateKeyPoints: item?.keyPoints ?? [],
    action: `enrichir « ${target?.slug} » plutôt que publier un second article`,
  };
}

const compared = (v) =>
  v && { with: v.slug, sharedIds: v.sharedIds, sharedUrls: v.sharedUrls, sharedNumbers: v.sharedNumbers,
    sharedEntities: v.sharedEntities, sharedActions: v.sharedActions, similarity: v.similarity, sameDay: v.sameDay };

/**
 * Insère un lot dans le catalogue. Renvoie le nouveau catalogue (nouveautés en tête, ordre du lot gardé)
 * et le journal des décisions. Ne modifie pas ses arguments.
 */
export function insertBatch(items, catalogue, { at = new Date().toISOString() } = {}) {
  const base = Array.isArray(catalogue) ? catalogue : [];
  const bySlug = new Map(base.map((p) => [p?.slug, p]));
  const inserted = [];
  const log = [];
  for (const item of Array.isArray(items) ? items : []) {
    try {
      if (!item || typeof item.slug !== "string" || !item.slug || typeof item.title !== "string") throw new Error("entrée sans slug ou sans titre");
      const same = bySlug.get(item.slug) ?? inserted.find((p) => p.slug === item.slug);
      if (same) {
        // Relance du même lot : rien n'est créé. Un autre article sous le même slug est bloqué.
        if (same.title === item.title && sourceKey(same) === sourceKey(item)) log.push({ slug: item.slug, decision: "déjà présent", at });
        else log.push({ slug: item.slug, decision: "en attente", reason: "slug déjà utilisé par une autre publication", at });
        continue;
      }
      const v = duplicateCheck(item, [...base, ...inserted]);
      if (v?.level === "doublon") {
        const found = bySlug.get(v.slug) ?? inserted.find((p) => p.slug === v.slug);
        // Un doublon d'un article retiré et fusionné renvoie vers l'article de référence.
        const target = found?.status === "withdrawn" && found.replacedBy ? bySlug.get(found.replacedBy) ?? found : found;
        log.push({ slug: item.slug, title: item.title, decision: "en attente", reason: v.reason, compared: compared(v),
          proposal: enrichmentProposal(item, target), at });
        continue;
      }
      inserted.push(item);
      log.push({ slug: item.slug, title: item.title, decision: v?.level === "revue" ? "inséré, revue demandée" : "inséré",
        ...(v ? { reason: v.reason, compared: compared(v) } : {}), at });
    } catch (error) {
      log.push({ slug: item?.slug ?? null, decision: "bloqué", reason: String(error?.message || error).slice(0, 200), at });
    }
  }
  return { catalogue: [...inserted, ...base], inserted: inserted.map((p) => p.slug), log };
}

/** Résumé lisible du journal, pour le rapport du lot. */
export function insertionMarkdown(log) {
  const rows = (log ?? []).map((x) => `| ${x.decision} | \`${x.slug ?? "?"}\` | ${(x.reason ?? "").replace(/\|/g, "/")} |`);
  return ["| Décision | Publication | Raison |", "| --- | --- | --- |", ...(rows.length ? rows : ["| aucune entrée | | |"])].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
  const batchFile = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
  if (!batchFile) { console.error("Usage: catalogue-insert.mjs <lot.json> [--catalogue …] [--report …]"); process.exit(2); }
  const file = resolve(opt("--catalogue", "content/publications.json"));
  const reportFile = resolve(opt("--report", "reports/insertion.json"));
  const batch = JSON.parse(readFileSync(resolve(batchFile), "utf8"));
  const items = Array.isArray(batch) ? batch : batch.items ?? [];
  // Le catalogue est relu ici, juste avant l'écriture : un lot publié entre-temps est pris en compte.
  const catalogue = JSON.parse(readFileSync(file, "utf8"));
  const result = insertBatch(items, catalogue);
  if (result.inserted.length) writeFileSync(file, JSON.stringify(result.catalogue, null, 2) + "\n");
  mkdirSync(dirname(reportFile), { recursive: true });
  const previous = existsSync(reportFile) ? JSON.parse(readFileSync(reportFile, "utf8")) : null;
  writeFileSync(reportFile, JSON.stringify({ batch: batchFile, inserted: result.inserted, log: result.log, previousRun: previous?.at ?? null, at: new Date().toISOString() }, null, 2) + "\n");
  for (const x of result.log) console.log("MUNDI insertion", x.decision, x.slug ?? "", x.reason ? "— " + x.reason : "");
  console.log(`MUNDI insertion : ${result.inserted.length} publication(s) ajoutée(s), ${result.log.filter((x) => x.decision === "en attente").length} en attente.`);
}
