import Link from "next/link";
import { formatDate, formatMinutes } from "@/lib/format";
import { formats, getTopic } from "@/lib/topics";
import type { Story } from "@/lib/types";
import { StoryVisual } from "./StoryVisual";

/** Vignette de récit utilisée dans Explorer, Enregistrés et les suggestions. */
export function StoryTile({ story }: { story: Story }) {
  const topic = getTopic(story.topic)!;
  return (
    <Link
      href={`/recit/${story.slug}/`}
      className="group flex gap-4 rounded-3xl bg-paper p-3 ring-1 ring-night/8 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-night/10 hover:ring-night/15"
    >
      <div className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-2xl sm:w-28">
        <StoryVisual pattern={topic.pattern} color={topic.color} seed={story.slug} className="h-full w-full transition duration-500 group-hover:scale-105" />
        <span className="absolute bottom-2 left-2 rounded-full bg-night/80 px-2 py-0.5 text-[0.65rem] font-semibold text-ivory">
          {formats[story.format].name}
        </span>
      </div>
      <div className="flex min-w-0 flex-col py-1 pr-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <span className="size-2 rounded-full" style={{ background: topic.color }} aria-hidden="true" />
          {topic.name}
        </p>
        <h3 className="mt-1.5 font-display text-lg leading-snug font-semibold text-night text-balance group-hover:text-blue">
          {story.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{story.dek}</p>
        <p className="mt-auto pt-2 text-xs text-muted">
          {formatMinutes(story.minutes)} · mis à jour le {formatDate(story.updatedAt)} · <span className="font-medium text-[#7a5410]">Démo</span>
        </p>
      </div>
    </Link>
  );
}
