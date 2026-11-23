#!/usr/bin/env node
/**
 * Correction ou retrait rapide d'un article publié, sans coder (workflow « Corriger ou retirer un article »).
 * - corriger : ajoute un rectificatif daté et visible sur la page, met à jour la date d'actualisation ;
 * - retirer : l'article disparaît du site mais reste dans le fichier (traçabilité, anti-doublon).
 * Aucun appel d'IA. Rien n'est effacé silencieusement.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function applyCorrection(list, { slug, action, note, date }) {
  if (!Array.isArray(list)) throw new Error("publications.json must be an array");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
  const text = String(note ?? "").trim().replace(/\s+/g, " ").slice(0, 600);
  if (text.length < 10) throw new Error("Explique la correction ou le retrait en une phrase (10 caractères minimum).");
  const i = list.findIndex((p) => p?.slug === slug && p.status === "published");
  if (i < 0) throw new Error("Aucun article publié avec cette adresse : " + slug);
  const p = { ...list[i] };
  if (action === "corriger") {
    p.corrections = [...(Array.isArray(p.corrections) ? p.corrections : []), { date, text }];
    if (p.updatedAt < date) p.updatedAt = date;
  } else if (action === "retirer") {
    p.status = "withdrawn";
    p.withdrawnAt = date;
    p.withdrawalReason = text;
  } else throw new Error("Action inconnue : choisir corriger ou retirer");
  const out = [...list];
  out[i] = p;
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = resolve("content/publications.json");
  const slug = String(process.env.MUNDI_SLUG || "").trim().replace(/^.*\/actualites\//, "").replace(/\/+$/, "");
  const out = applyCorrection(JSON.parse(readFileSync(file, "utf8")), {
    slug, action: process.env.MUNDI_ACTION, note: process.env.MUNDI_NOTE, date: new Date().toISOString().slice(0, 10) });
  writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  console.log("MUNDI : " + process.env.MUNDI_ACTION + " appliqué à " + slug);
}
