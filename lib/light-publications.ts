import type { EditorialPhoto } from "./editorial-images";
import { formatOf } from "./home";
import { publicationKind } from "./publication-kind";
import type { FeedPublication } from "./verified";

/**
 * Versions allégées des publications pour les pages qui les reçoivent toutes (ticket #120).
 * Next.js inclut dans le HTML tout ce qu'on passe à un composant client : on n'y met que
 * ce que la page affiche ou cherche, jamais les cartes du fil, les fonds ou le décryptage complet.
 */

function lightPhoto(photo: EditorialPhoto): EditorialPhoto {
  const { src, credit, license, licenseUrl, sourceUrl } = photo;
  return { src, credit, license, licenseUrl, sourceUrl } as EditorialPhoto;
}

/** Explorer : ce qu'il faut pour chercher (titre, résumé, idées, sources) et afficher une tuile. */
export function toExploreItem(p: FeedPublication): FeedPublication {
  const stat = p.dataCards?.find((c) => c.kind === "stat");
  return {
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    topic: p.topic,
    kind: publicationKind(p),
    status: p.status,
    publishedAt: p.publishedAt,
    updatedAt: p.updatedAt,
    ...(p.eventDate ? { eventDate: p.eventDate } : {}),
    ...(p.aiVerified ? { aiVerified: true } : {}),
    reviewedBy: p.reviewedBy,
    keyPoints: p.keyPoints,
    sources: p.sources,
    // Photo de la une : l'image et son crédit seulement (pas les champs internes du catalogue).
    ...(p.photo ? { photo: lightPhoto(p.photo) } : {}),
    // Le chiffre clé de la une : la première carte chiffrée seulement.
    ...(stat ? { dataCards: [stat] } : {}),
  };
}

/** Bibliothèque : une ligne par contenu enregistré. */
export type SavedItem = {
  slug: string;
  title: string;
  topic: FeedPublication["topic"];
  publishedAt: string;
  format: string;
  aiVerified?: boolean;
  sourceCount: number;
};

export function toSavedItem(p: FeedPublication): SavedItem {
  return {
    slug: p.slug,
    title: p.title,
    topic: p.topic,
    publishedAt: p.publishedAt,
    format: formatOf(p),
    ...(p.aiVerified ? { aiVerified: true } : {}),
    sourceCount: p.sources.length,
  };
}
