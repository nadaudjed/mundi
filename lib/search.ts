import { normalize } from "./format";
import { getTopic } from "./topics";
import type { FeedPublication } from "./verified";

/**
 * Searches only the already-public verified publications passed by the server.
 * No draft, private source or editorial archive is ever indexed client-side.
 */
export function searchPublications(publications: readonly FeedPublication[], query: string): FeedPublication[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [...publications];
  return publications
    .map((publication) => {
      const title = normalize(publication.title);
      const corpus = normalize([
        publication.title, publication.summary, getTopic(publication.topic)?.name ?? "",
        ...publication.keyPoints, ...publication.sources.map((s) => s.label),
      ].join(" "));
      if (!terms.every((term) => corpus.includes(term))) return null;
      return { publication, score: terms.reduce((score, term) => score + (title.includes(term) ? 3 : 1), 0) };
    })
    .filter((hit): hit is { publication: FeedPublication; score: number } => hit !== null)
    .sort((a, b) => b.score - a.score || b.publication.publishedAt.localeCompare(a.publication.publishedAt))
    .map((hit) => hit.publication);
}

/** Même règle pour les dossiers : chaque mot doit apparaître, le titre compte triple. */
export function searchDossiers<T extends { title: string; intro: string; terms: string; topic: string; updatedAt: string }>(
  dossiers: readonly T[], query: string,
): T[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [...dossiers];
  return dossiers
    .map((d) => {
      const title = normalize(d.title);
      const corpus = normalize([d.title, d.intro, d.terms, getTopic(d.topic)?.name ?? ""].join(" "));
      if (!terms.every((term) => corpus.includes(term))) return null;
      return { d, score: terms.reduce((s, term) => s + (title.includes(term) ? 3 : 1), 0) };
    })
    .filter((hit): hit is { d: T; score: number } => hit !== null)
    .sort((a, b) => b.score - a.score || b.d.updatedAt.localeCompare(a.d.updatedAt))
    .map((hit) => hit.d);
}
