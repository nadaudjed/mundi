import Link from "next/link";
import { formatDate } from "@/lib/format";
import { publicationPath } from "@/lib/publication-links";
import { getTopic, inkOn } from "@/lib/topics";
import type { FeedPublication } from "@/lib/verified";
import { StoryVisual } from "./StoryVisual";
import { Icon } from "./Icon";

/**
 * Carte documentaire pour Actualités et Explorer.
 * La photo est illustrative et le type de vérification reste explicite.
 */
export function PublicationTile({ publication: p, featured = false }: {
  publication: FeedPublication; featured?: boolean;
}) {
  const topic = getTopic(p.topic);
  if (!topic) return null;
  return (
    <article data-testid="publication-tile" data-topic={p.topic}
      className={"group min-w-0 overflow-hidden rounded-[1.7rem] border border-night/10 bg-paper shadow-[0_4px_24px_-18px_rgba(16,29,48,0.4)] transition duration-300 hover:-translate-y-0.5 hover:border-night/25 hover:shadow-[0_18px_45px_-25px_rgba(16,29,48,0.5)] " + (featured ? "md:col-span-2" : "")}>
      <Link href={publicationPath(p.slug)} className="block focus-visible:outline-offset-[-3px]">
        <div className={"relative overflow-hidden bg-night " + (featured ? "aspect-[16/9] md:aspect-[21/8]" : "aspect-[16/9]")}>
          {p.photo ? (
            // Local Commons photograph; the article page links to source and exact licence.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photo.src} alt="" loading={featured ? "eager" : "lazy"} decoding="async"
              className="h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.035]" />
          ) : (
            <StoryVisual pattern={topic.pattern} color={topic.color} seed={p.slug} className="h-full w-full" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/90 via-night/10 to-transparent" />
          <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: topic.color, color: inkOn(topic.color) }}>{topic.name}</span>
            <span className="rounded-full border border-ivory/20 bg-night/70 px-2.5 py-1 text-[0.7rem] font-medium text-ivory backdrop-blur-sm">
              {p.photo ? "Photo d’illustration" : "Illustration MUNDI"}
            </span>
          </div>
        </div>
        <div className="p-5 pb-4 sm:p-6 sm:pb-4">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-blue-ink">
            <span className="inline-flex items-center gap-1"><Icon name="check" className="size-3.5" /> Publication sourcée</span>
            <span className="text-night/30" aria-hidden="true">·</span>
            <span className="text-muted normal-case tracking-normal">{p.aiVerified ? "Contrôle IA, sans relecture humaine" : "Validation humaine"}</span>
          </p>
          <h2 className={"mt-3 font-display font-semibold leading-[1.13] text-night text-balance transition-colors group-hover:text-blue-ink " + (featured ? "text-[1.6rem] sm:text-[2.15rem]" : "text-[1.4rem] sm:text-[1.65rem]")}>{p.title}</h2>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{p.summary}</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-night/10 pt-4">
            <span className="text-xs text-muted"><time dateTime={p.publishedAt}>{formatDate(p.publishedAt)}</time> · {p.sources.length} sources</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-ink">
              Lire l&apos;article <Icon name="arrow-right" className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </Link>
      {p.photo && (
        <p className="border-t border-night/5 px-5 py-2 text-[0.68rem] text-muted sm:px-6">
          Photo : {p.photo.credit} · {p.photo.license} · <Link href={publicationPath(p.slug)} className="underline underline-offset-2 hover:text-blue-ink">crédits détaillés</Link>
        </p>
      )}
    </article>
  );
}
