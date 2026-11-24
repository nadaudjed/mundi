import { feedPublications } from "@/lib/verified";

/**
 * Liste légère des publications en ligne (identifiants seulement), relue par le Fil
 * quand on tire vers le bas pour savoir s'il y a de nouveaux articles.
 * Générée au moment de la construction : aucune donnée privée, aucun brouillon.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json({ slugs: feedPublications.map((p) => p.slug) });
}
