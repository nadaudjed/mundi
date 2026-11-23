import publications from "@/content/publications.json";
import { topics } from "./topics";
import type { TopicSlug } from "./types";

export type EditorialSection = { kind: "fait" | "analyse" | "hypothese"; heading: string; text: string };
export type EditorialSource = { label: string; url: string };
export type Publication = {
  slug: string; title: string; summary: string; topic: TopicSlug;
  publishedAt: string; updatedAt: string; status: "published"; reviewedBy: string;
  keyPoints: [string, string, string]; sections: EditorialSection[]; sources: EditorialSource[];
  /** Publiée automatiquement après le vérificateur IA, sans relecture humaine (affiché au lecteur). */
  aiVerified?: true;
};

const allowed = new Set<string>(topics.map(t => t.slug));
const text = (v: unknown, len = 1) => typeof v === "string" && v.trim().length >= len;
const date = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
function validUrl(v: unknown) {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !["example.com","example.org","example.net","localhost"].includes(u.hostname);
  } catch { return false; }
}

/* Validation technique, pas vérification des faits. */
export function validatePublication(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["Document invalide"];
  const p = value as Record<string, unknown>;
  const errors: string[] = [];
  if (!text(p.slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(p.slug))) errors.push("Slug invalide");
  if (!text(p.title, 12)) errors.push("Titre trop court");
  if (!text(p.summary, 30)) errors.push("Résumé trop court");
  if (!allowed.has(String(p.topic))) errors.push("Sujet inconnu");
  if (p.status !== "published") errors.push("Statut non publié");
  if (!text(p.reviewedBy, 3)) errors.push("Validateur éditorial absent");
  if (!date(p.publishedAt) || !date(p.updatedAt)) errors.push("Dates invalides");
  if (date(p.publishedAt) && date(p.updatedAt) && String(p.updatedAt) < String(p.publishedAt)) errors.push("Dates incohérentes");
  if (!Array.isArray(p.keyPoints) || p.keyPoints.length !== 3 || !p.keyPoints.every(x => text(x,12))) errors.push("Trois idées clés requises");
  if (!Array.isArray(p.sources) || p.sources.length < 2 || !p.sources.every(s => s && text(s.label,3) && validUrl(s.url))) errors.push("Deux sources HTTPS au minimum");
  if (!Array.isArray(p.sections) || p.sections.length < 1 || !p.sections.every(s => s && ["fait","analyse","hypothese"].includes(s.kind) && text(s.heading) && text(s.text,30))) errors.push("Sections invalides");
  return errors;
}

export const publishedArticles: Publication[] = (publications as unknown[])
  .filter(item => validatePublication(item).length === 0)
  .map(item => item as Publication)
  .sort((a,b) => b.publishedAt.localeCompare(a.publishedAt));

export const getPublication = (slug: string) => publishedArticles.find(p => p.slug === slug);
