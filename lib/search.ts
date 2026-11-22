import { normalize } from "./format";
import { stories } from "./stories";
import { getTopic, formats } from "./topics";
import type { Story } from "./types";

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
