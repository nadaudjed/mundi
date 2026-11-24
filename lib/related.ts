import { normalize } from "./format";
import { publicationKind } from "./publication-kind";
import type { FeedPublication } from "./verified";

/**
 * Liens entre les deux espaces de MUNDI :
 * - sous une actualité, les concepts et récits « Pour comprendre » ;
 * - sous un concept ou un récit, les actualités où la notion sert.
 * Calcul fait au build, sans service externe : même rubrique (poids fort),
 * puis mots significatifs partagés (titre, chapô, points clés).
 */
const STOPWORDS = new Set(
  ("avec dans pour plus moins sans sous entre selon depuis apres avant leurs elles ils nous vous mais donc ainsi aussi " +
    "comme comment pourquoi quand quoi quel quelle quels quelles cette cettes ces ceux celle celles tout tous toute toutes " +
    "fait faire peut etre sont sera ete avoir était etait leur notre votre dont part vers chez encore deja tres bien " +
    "annee annees mois jour jours premier premiere nouveau nouvelle nouveaux selon " +
    "europe europeen europeenne europeens commission union france francais francaise pays monde milliard million euros " +
    "fonctionne fonctionnement vraiment veulent dire autre autres seulement".split(" ")),
);

export function keywords(p: Pick<FeedPublication, "title" | "summary" | "keyPoints">): Set<string> {
  const text = normalize([p.title, p.summary, ...(p.keyPoints ?? [])].join(" "));
  return new Set(
    text
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 5 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
      // Pluriels simples : « dechets » et « dechet » se rejoignent.
      .map((w) => (w.endsWith("s") || w.endsWith("x") ? w.slice(0, -1) : w)),
  );
}

/** Rubriques voisines : un lien entre elles demande moins de mots en commun. */
const NEIGHBOURS: string[][] = [
  ["economie", "finance", "entreprises"],
  ["energie", "environnement", "materiaux-critiques", "recyclage"],
  ["industrie", "entreprises", "technologie", "materiaux-critiques"],
  ["geopolitique", "afrique"],
  ["technologie", "sciences-societe"],
];
const neighbours = (a: string, b: string) => NEIGHBOURS.some((g) => g.includes(a) && g.includes(b));

export function relatedPublications(target: FeedPublication, all: readonly FeedPublication[], limit = 3): FeedPublication[] {
  const wantNews = publicationKind(target) !== "actualite";
  const own = keywords(target);
  return all
    .filter((p) => p.slug !== target.slug && (publicationKind(p) === "actualite") === wantNews)
    .map((p) => {
      let shared = 0;
      for (const w of keywords(p)) if (own.has(w)) shared++;
      // Même rubrique : toujours lié. Rubrique voisine : 3 mots en commun. Sinon : 6, pour ne jamais forcer un lien.
      const needed = p.topic === target.topic ? 0 : neighbours(p.topic, target.topic) ? 3 : 6;
      return { p, score: (p.topic === target.topic ? 10 : 0) + shared, ok: shared >= needed };
    })
    .filter((x) => x.ok)
    .sort((a, b) => b.score - a.score || b.p.publishedAt.localeCompare(a.p.publishedAt))
    .slice(0, limit)
    .map((x) => x.p);
}
