import { topics } from "./topics";
import type { TopicSlug } from "./types";

/**
 * Lecture d'une fiche de veille « mundi-candidate-v1 » (docs/CANDIDATE_HANDOFF.md).
 *
 * Une fiche est une PISTE NON VÉRIFIÉE : elle ne contient ni texte factuel ni
 * validation. Ce module n'accepte que le statut `candidate_unverified` et ne
 * renvoie que des éléments attribuables (titre provisoire, rubrique suggérée,
 * média source, adresse, date externe, page de droits).
 * Tout est traité comme du texte brut : React échappe l'affichage, les
 * adresses doivent être en HTTPS, sans identifiants, et les caractères de
 * contrôle sont refusés.
 */
export const CANDIDATE_FORMAT = "mundi-candidate-v1";
export const MAX_CANDIDATE_BYTES = 20_000;

export type Candidate = {
  headline: string;
  source: { label: string; url: string };
  topic: TopicSlug | null;
  /** Date de la source EXTERNE (pas une date de publication MUNDI). */
  externalPublishedAt: string | null;
  licenseUrl: string | null;
  /** Clés présentes dans le fichier mais ignorées par l'import. */
  ignored: string[];
};

export type CandidateResult = { ok: true; candidate: Candidate } | { ok: false; errors: string[] };

const KNOWN = new Set(["format", "reviewStatus", "headline", "source", "topicHint", "publishedAt", "licenseUrl"]);
const topicSlugs = new Set<string>(topics.map((t) => t.slug));
// Caractères de contrôle (sauf aucun : une fiche n'a pas de retour à la ligne) et caractères de mise en forme bidirectionnelle.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/;

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  if (!text || text.length > max || UNSAFE.test(value.replace(/[\n\r\t]/g, " "))) return null;
  return text;
}

/** Adresse HTTPS publique, sans identifiants ni hôte local. */
export function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000 || UNSAFE.test(value)) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (url.hostname === "localhost" || url.hostname.endsWith(".local") || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(":")) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function parseCandidate(text: string): CandidateResult {
  if (new TextEncoder().encode(text).length > MAX_CANDIDATE_BYTES) {
    return { ok: false, errors: ["Le fichier est trop volumineux pour une fiche de veille (20 Ko maximum)."] };
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["Ce fichier n'est pas un JSON lisible. Choisissez un fichier « mundi-candidat-….json »."] };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, errors: ["Le fichier doit contenir une seule fiche de veille."] };
  }
  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (d.format !== CANDIDATE_FORMAT) errors.push(`Format non reconnu : la fiche doit indiquer « ${CANDIDATE_FORMAT} ».`);
  if (d.reviewStatus !== "candidate_unverified") {
    errors.push("Statut refusé : seule une piste non vérifiée (« candidate_unverified ») peut être importée. L'atelier n'accepte aucun statut publié ou validé.");
  }
  const headline = cleanText(d.headline, 220);
  if (!headline) errors.push("Titre manquant, trop long (220 caractères maximum) ou contenant des caractères interdits.");

  const src = d.source && typeof d.source === "object" && !Array.isArray(d.source) ? (d.source as Record<string, unknown>) : null;
  const label = cleanText(src?.label, 120);
  const url = safeHttpsUrl(src?.url);
  if (!label) errors.push("Nom du média source manquant ou invalide.");
  if (!url) errors.push("Adresse de la source invalide : seules les adresses publiques en HTTPS sont acceptées.");

  let externalPublishedAt: string | null = null;
  if (d.publishedAt !== undefined && d.publishedAt !== null) {
    if (typeof d.publishedAt !== "string" || Number.isNaN(Date.parse(d.publishedAt)) || !/^\d{4}-\d{2}-\d{2}/.test(d.publishedAt)) {
      errors.push("Date de la source invalide (format attendu : 2026-11-23T09:00:00Z).");
    } else {
      externalPublishedAt = new Date(d.publishedAt).toISOString();
    }
  }

  let licenseUrl: string | null = null;
  if (d.licenseUrl !== undefined && d.licenseUrl !== null && d.licenseUrl !== "") {
    licenseUrl = safeHttpsUrl(d.licenseUrl);
    if (!licenseUrl) errors.push("Adresse des conditions d'utilisation invalide (HTTPS requis).");
  }

  if (errors.length) return { ok: false, errors };
  const hint = typeof d.topicHint === "string" ? d.topicHint : "";
  return {
    ok: true,
    candidate: {
      headline: headline!,
      source: { label: label!, url: url! },
      topic: topicSlugs.has(hint) ? (hint as TopicSlug) : null,
      externalPublishedAt,
      licenseUrl,
      ignored: Object.keys(d).filter((k) => !KNOWN.has(k)),
    },
  };
}
