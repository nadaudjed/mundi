/**
 * Accueil en défilement naturel (ticket #113) : une édition courte puis les
 * dernières publications, chargées par lots.
 * Fonctions pures, utilisées au build (page d'accueil, /accueil.json) et dans les tests.
 */
import { KIND_LABEL, publicationKind, type PublicationKind } from "./publication-kind";
import { twoSentences } from "./today";
import { frenchSpacing } from "./typo";
import { verificationLabel } from "./verification";
import type { TopicSlug } from "./types";

/** Nombre de publications par lot dans « Dernières publications ». */
export const HOME_BATCH = 12;

/** Ce qu'une ligne de « Dernières publications » affiche : léger, sans texte long ni image. */
export type HomeItem = {
  slug: string;
  title: string;
  topic: TopicSlug;
  kind: PublicationKind;
  format: string;
  publishedAt: string;
  eventDate?: string;
  verification: string;
  sources: number;
};

type Source = {
  slug: string; title: string; topic: TopicSlug; kind?: PublicationKind; publishedAt: string; eventDate?: string;
  aiVerified?: boolean; sources: unknown[]; summary: string;
  decryptage?: { format: string; shortTitle: string; essentiel: { fait: string; consequence: string } };
};

export function formatOf(p: Pick<Source, "kind" | "decryptage">): string {
  return p.decryptage?.format ?? KIND_LABEL[publicationKind(p)];
}

/** L'enjeu en une phrase : le fait de « L'essentiel », sinon la première phrase du résumé. */
export function stakeOf(p: Pick<Source, "summary" | "decryptage">): string {
  if (p.decryptage) return frenchSpacing(p.decryptage.essentiel.fait);
  const first = p.summary.trim().match(/[^.!?…]+(?:[.!?…]+|$)/)?.[0] ?? twoSentences(p.summary);
  return frenchSpacing(first.trim());
}

export function toHomeItem(p: Source): HomeItem {
  return {
    slug: p.slug,
    title: frenchSpacing(p.title),
    topic: p.topic,
    kind: publicationKind(p),
    format: formatOf(p),
    publishedAt: p.publishedAt,
    ...(p.eventDate ? { eventDate: p.eventDate } : {}),
    verification: verificationLabel(p),
    sources: p.sources.length,
  };
}

/** Dernières publications, de la plus récente à la plus ancienne, sans les sujets déjà en tête. */
export function latestAfter<T extends { slug: string; publishedAt: string }>(publications: readonly T[], exclude: Iterable<string>): T[] {
  const skip = new Set(exclude);
  const seen = new Set<string>();
  return [...publications]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug))
    .filter((p) => !skip.has(p.slug) && !seen.has(p.slug) && seen.add(p.slug));
}

/** Archive chronologique : blocs par mois de publication, dans l'ordre reçu (le plus récent d'abord). */
export function byMonth<T extends { publishedAt: string }>(items: readonly T[]): { key: string; label: string; items: T[] }[] {
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const item of items) {
    const key = item.publishedAt.slice(0, 7);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`));
      group = { key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}
