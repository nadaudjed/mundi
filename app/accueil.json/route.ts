import { latestAfter, toHomeItem } from "@/lib/home";
import { feedPublications } from "@/lib/verified";

/**
 * Lignes légères de « Dernières publications » (accueil) : titre, rubrique, format,
 * date, statut de vérification et nombre de sources. L'accueil n'affiche qu'un premier
 * lot dans sa page et lit ce fichier pour les lots suivants.
 * Généré au build : aucune donnée privée, aucun brouillon.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json({ items: latestAfter(feedPublications, []).map(toHomeItem) });
}
