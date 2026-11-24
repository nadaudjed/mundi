import Link from "next/link";
import { formatDate, formatMinutes } from "@/lib/format";
import { formats, getTopic } from "@/lib/topics";
import type { Story } from "@/lib/types";

/** Récit de démonstration dans une liste (Explorer, Enregistrés, suggestions) : une ligne de texte. */
export function StoryTile({ story }: { story: Story }) {
  const topic = getTopic(story.topic)!;
  return (
    <article className="group min-w-0 border-b border-rule py-4">
      <p className="text-meta font-semibold text-accent">{topic.name}</p>
      <h3 className="mt-1 font-display text-lg leading-snug font-semibold text-ink text-balance [overflow-wrap:anywhere]">
        <Link href={`/recit/${story.slug}/`} className="title-link">{story.title}</Link>
      </h3>
      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{story.dek}</p>
      <p className="mt-2 text-meta text-muted">
        <span className="font-semibold text-demo">Démonstration</span> · {formats[story.format].name} ·{" "}
        <span className="font-mono">{formatMinutes(story.minutes)}</span> · mis à jour le <time dateTime={story.updatedAt} className="font-mono">{formatDate(story.updatedAt)}</time>
      </p>
    </article>
  );
}
