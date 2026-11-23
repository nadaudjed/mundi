import { normalize } from "./format";
import { stories } from "./stories";
import { getTopic, formats } from "./topics";
import type { Story } from "./types";
import type { FeedPublication } from "./verified";

function haystack(story: Story): string {
  const topic = getTopic(story.topic)?.name ?? "";
  return normalize(
    [
      story.title,
      story.dek,
      topic,
      formats[story.format].name,
      ...story.keyPoints,
      ...story.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
    ].join(" "),
  );
}

const index = stories.map((story) => ({ story, text: haystack(story), title: normalize(story.title) }));

/** Recherche plein texte simple sur les contenus de démonstration. */
export function searchStories(query: string): Story[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return index
    .filter(({ text }) => terms.every((t) => text.includes(t)))
    .map(({ story, title }) => ({
      story,
      score: terms.reduce((acc, t) => acc + (title.includes(t) ? 2 : 1), 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ story }) => story);
}


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
