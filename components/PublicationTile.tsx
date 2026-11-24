import Link from "next/link";
import { keyFigureOf } from "@/lib/covers";
import { formatDate } from "@/lib/format";
import { publicationPath } from "@/lib/publication-links";
import { getTopic } from "@/lib/topics";
import { verificationLabel } from "@/lib/verification";
import type { FeedPublication } from "@/lib/verified";
import { EditorialPhotoCredit } from "./EditorialPhotoLayer";
import { KeyFigure } from "./KeyFigure";
import { NewsDate } from "./NewsDate";

/**
 * Publication dans une liste (Actualités, Explorer).
 * - `featured` : la une, en grand (chiffre clé ou photo, titre très grand, chapô) ;
 * - sinon : une ligne compacte (rubrique, titre, ligne d'informations).
 * Une seule étiquette : la rubrique, en texte coloré. Le reste tient sur une ligne grise.
 */
export function PublicationTile({ publication: p, featured = false, headingLevel = 2 }: {
  publication: FeedPublication; featured?: boolean; headingLevel?: 2 | 3;
}) {
  const topic = getTopic(p.topic);
  if (!topic) return null;
  const figure = keyFigureOf(p);
  const H = headingLevel === 2 ? "h2" : "h3";
  const href = publicationPath(p.slug);
  return (
    <article data-testid="publication-tile" data-topic={p.topic} className={"group min-w-0 " + (featured ? "" : "border-b border-rule py-5 first:pt-0 last:border-b-0")}>
      {featured && (figure ? (
        <div className="mb-5"><KeyFigure figure={figure} size="md" /></div>
      ) : p.photo ? (
        <Link href={href} tabIndex={-1} aria-hidden="true" className="mb-5 block overflow-hidden bg-night">
          {/* Photo locale de Commons : illustration du domaine, jamais une preuve de l'événement. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.photo.src} alt="" loading="eager" decoding="async" className="photo aspect-[3/2] w-full object-cover" />
        </Link>
      ) : null)}
      <p className="text-meta font-semibold text-accent">
        {topic.name}
      </p>
      <NewsDate publication={p} className="mt-0.5 text-meta font-semibold text-ink" />
      <H className={"mt-1.5 font-display font-semibold text-ink text-balance " + (featured ? "text-titre" : "text-xl leading-snug")}>
        <Link href={href} className="title-link">{p.title}</Link>
      </H>
      {featured && <p className="mt-3 max-w-prose text-base leading-relaxed text-muted">{p.summary}</p>}
      <p className="mt-3 text-meta text-muted" data-testid="publication-meta-line">
        {p.photo && !figure && featured ? <><EditorialPhotoCredit photo={p.photo} /> · </> : null}
        <span>{verificationLabel(p)}</span> · <time dateTime={p.publishedAt}>{formatDate(p.publishedAt)}</time> ·{" "}
        {p.sources.length} sources
      </p>
    </article>
  );
}
