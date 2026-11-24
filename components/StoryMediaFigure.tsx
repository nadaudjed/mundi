import { getStoryMedia } from "@/lib/media";

/** Média principal d'une page de récit, avec ses crédits visibles en légende. */
export function StoryMediaFigure({ slug }: { slug: string }) {
  const media = getStoryMedia(slug);
  if (!media) return null;
  return (
    <figure className="mt-10 overflow-hidden rounded-3xl bg-night ring-1 ring-rule">
      {media.kind === "video" ? (
        <video
          controls
          muted
          playsInline
          preload="none"
          poster={media.poster}
          aria-label={media.description}
          className="mx-auto aspect-[9/16] max-h-[70vh] bg-night"
        >
          {media.sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
          <track kind="captions" src={media.captions.src} srcLang={media.captions.srclang} label={media.captions.label} default />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.src} alt={media.alt} width={media.width} height={media.height} loading="lazy" decoding="async" className="mx-auto h-auto max-h-[70vh] w-auto" />
      )}
      <figcaption className="bg-surface px-5 py-3 text-xs leading-relaxed text-muted">
        {media.kind === "video" && <span className="block text-ink/80">{media.description}</span>}
        <span className="font-semibold text-ink">© {media.credit.author}</span> · {media.credit.license}. {media.credit.provenance}
      </figcaption>
    </figure>
  );
}
