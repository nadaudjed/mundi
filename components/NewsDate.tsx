import { formatLongDate } from "@/lib/format";
import { publicationKind } from "@/lib/publication-kind";
import type { PublicationKind } from "@/lib/publication-kind";

/**
 * Date bien visible d'une publication, pour savoir de quel jour date une actualité
 * (et limiter la circulation d'informations périmées). Actualité : « Publiée le
 * mardi 24 novembre 2026 ». Concept : « Concept publié le … ».
 */
export function NewsDate({ publication: p, className = "", compact = false }: {
  publication: { publishedAt: string; kind?: PublicationKind }; className?: string;
  /** Carte du Fil : la date seule (« Mardi 24 novembre 2026 »), sous la rubrique. */
  compact?: boolean;
}) {
  const news = publicationKind(p) === "actualite";
  const date = formatLongDate(p.publishedAt);
  return (
    <p className={className} data-testid="news-date">
      {compact ? (
        <time dateTime={p.publishedAt} title={(news ? "Actualité publiée le " : "Concept publié le ") + date}>
          {date.charAt(0).toUpperCase() + date.slice(1)}
        </time>
      ) : (
        <>
          {news ? "Actualité publiée le " : "Concept publié le "}
          <time dateTime={p.publishedAt}>{date}</time>
        </>
      )}
    </p>
  );
}
