import { formatDate, formatLongDate } from "@/lib/format";
import { publicationKind } from "@/lib/publication-kind";
import type { PublicationKind } from "@/lib/publication-kind";

type Dated = { publishedAt: string; eventDate?: string; kind?: PublicationKind };

const PUBLISHED: Record<PublicationKind, string> = {
  actualite: "Actualité publiée le ",
  concept: "Concept publié le ",
  recit: "Récit publié le ",
};

/**
 * Date bien visible d'une publication, pour savoir de quel jour date une actualité
 * (et limiter la circulation d'informations périmées).
 * - Actualité avec date d'événement : « Événement du lundi 23 novembre 2026 · publiée le 24 novembre 2026 ».
 * - Sinon : « Actualité publiée le mardi 24 novembre 2026 » (ou « Concept publié le … »).
 * `compact` (carte du Fil) : seulement la date qui compte le plus, la publication restant dans la ligne grise.
 */
export function NewsDate({ publication: p, className = "", compact = false }: { publication: Dated; className?: string; compact?: boolean }) {
  const kind = publicationKind(p);
  const event = kind === "actualite" && p.eventDate ? p.eventDate : null;
  if (compact) {
    return (
      <p className={className} data-testid="news-date">
        {event ? (
          <>Événement du <time dateTime={event}>{formatDate(event)}</time></>
        ) : (
          <time dateTime={p.publishedAt} title={PUBLISHED[kind] + formatLongDate(p.publishedAt)}>{capitalize(formatLongDate(p.publishedAt))}</time>
        )}
      </p>
    );
  }
  return (
    <p className={className} data-testid="news-date">
      {event ? (
        <>
          Événement du <time dateTime={event}>{formatLongDate(event)}</time>
          <span className="font-normal text-muted"> · publiée le <time dateTime={p.publishedAt}>{formatDate(p.publishedAt)}</time></span>
        </>
      ) : (
        <>
          {PUBLISHED[kind]}
          <time dateTime={p.publishedAt}>{formatLongDate(p.publishedAt)}</time>
        </>
      )}
    </p>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
