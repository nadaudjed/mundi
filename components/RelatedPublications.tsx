import { publicationKind } from "@/lib/publication-kind";
import { relatedPublications } from "@/lib/related";
import type { FeedPublication } from "@/lib/verified";
import { PublicationTile } from "./PublicationTile";

/**
 * Pont entre les deux espaces : sous une actualité, les notions « Pour comprendre » ;
 * sous un concept ou un récit, les actualités où il sert. Rien n'est affiché sans lien réel.
 */
export function RelatedPublications({ publication, all }: { publication: FeedPublication; all: readonly FeedPublication[] }) {
  const related = relatedPublications(publication, all);
  if (!related.length) return null;
  const news = publicationKind(publication) === "actualite";
  const title = news ? "Pour comprendre" : "Dans l'actualité";
  const hint = news ? "Les notions utiles pour lire cette actualité." : "Les actualités où cette notion sert.";
  return (
    <section className="mt-14" aria-labelledby="related-titre" data-testid="related" data-related-kind={news ? "comprendre" : "actualite"}>
      <h2 id="related-titre" className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-muted">{hint}</p>
      <div className="mt-4">
        {related.map((p) => <PublicationTile key={p.slug} publication={p} headingLevel={3} />)}
      </div>
    </section>
  );
}
