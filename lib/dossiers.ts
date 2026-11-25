/**
 * Dossiers de référence (ticket #120) : une page à adresse stable qui réunit des
 * publications déjà vérifiées, une chronologie, des chiffres sourcés et « Ce qui a changé ».
 * Fonctions pures, utilisées au build et dans les tests.
 */
import data from "@/content/dossiers.json";
import type { TopicSlug } from "./types";

export type Source = { label: string; url: string };
export type DossierUpdate = { id: string; date: string; kind: "fait" | "correction"; text: string; href?: string; source?: Source };
export type Dossier = {
  id: string;
  status: "pilote" | "publie" | "retire";
  title: string;
  shortTitle: string;
  topic: TopicSlug;
  createdAt: string;
  updatedAt: string;
  byline: string;
  verification: string;
  intro: string;
  publications: { slug: string; role: string }[];
  essentiel: string[];
  figures: { value: string; label: string; scope: string; year: string; source: Source }[];
  map?: { src: string; title: string; alt: string; caption: string; credit: string };
  timeline: { date: string; label: string; text: string; source: Source }[];
  updates: DossierUpdate[];
  corrections: { date: string; text: string }[];
  interview: { question: string; answer: string }[] | null;
  /** Éléments éditoriaux attendus : jamais affichés au public, listés pour la rédaction. */
  missing: string[];
};

export const dossiers = (data as Dossier[]).filter((d) => d.status !== "retire");
export const getDossier = (id: string) => dossiers.find((d) => d.id === id);
export const dossierPath = (id: string) => `/dossiers/${id}/`;
/** Le dossier dont une publication fait partie, pour le lien depuis l'article. */
export const dossierOf = (slug: string) => dossiers.find((d) => d.publications.some((p) => p.slug === slug));

/** Mises à jour de la plus récente à la plus ancienne. */
export function sortedUpdates<T extends { date: string }>(updates: readonly T[]): T[] {
  return [...updates].sort((a, b) => b.date.localeCompare(a.date));
}

/** Résumé léger pour Bibliothèque : titre et mises à jour, sans le contenu du dossier. */
export type DossierSummary = { id: string; title: string; updates: DossierUpdate[] };
export const dossierSummaries = (): DossierSummary[] =>
  dossiers.map((d) => ({ id: d.id, title: d.title, updates: sortedUpdates(d.updates) }));
