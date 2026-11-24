import { feedPublications } from "@/lib/verified";

/**
 * Liste légère des publications en ligne, relue :
 * - par le Fil quand on tire vers le bas (nouveaux articles ?) ;
 * - après chaque déploiement, pour la notification d'édition (titres).
 * Générée au moment de la construction : aucune donnée privée, aucun brouillon.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json({
    slugs: feedPublications.map((p) => p.slug),
    items: feedPublications.map((p) => ({ slug: p.slug, title: p.title })),
  });
}
