import { publicationKind, type PublicationKind } from "./publication-kind";
import type { TopicSlug } from "./types";

/**
 * Mélange partiel du Fil « Pour vous » : l'ordre change à chaque visite,
 * sans devenir un tirage au hasard complet.
 * - la première publication (la plus récente) reste en tête ;
 * - les actualités et les publications les plus récentes restent près du haut ;
 * - deux publications du même sujet ne se suivent pas, et pas plus de deux
 *   publications du même genre (actualité, récit, concept) à la suite,
 *   tant que le reste du fil le permet.
 * Le même tirage (seed) donne toujours le même ordre : le retour arrière
 * retrouve donc l'écran où l'on était.
 */
type Mixable = { slug: string; topic: TopicSlug; publishedAt: string; kind?: PublicationKind };

/** Ampleur du mélange : une publication bouge en moyenne de quelques places. */
const SPREAD = 14;
/** Avance donnée aux actualités (en places). */
const NEWS_BONUS = 3;
/** Recul par jour d'ancienneté (en places). */
const DAY_PENALTY = 4;
/** Nombre de publications regardées à l'avance pour éviter les répétitions. */
const LOOKAHEAD = 8;

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const day = (iso: string) => Date.parse(iso.slice(0, 10)) / 86_400_000;

export function newFeedSeed() {
  return Math.floor(Math.random() * 2 ** 31) + 1;
}

export function mixFeed<T extends Mixable>(items: readonly T[], seed: number): T[] {
  if (items.length < 3) return [...items];
  const rand = random(seed);
  const [first, ...rest] = items;
  const newest = Math.max(...items.map((p) => day(p.publishedAt) || 0));
  const scored = rest
    .map((p, i) => ({
      p,
      score:
        i +
        rand() * SPREAD -
        (publicationKind(p) === "actualite" ? NEWS_BONUS : 0) +
        Math.max(0, newest - (day(p.publishedAt) || newest)) * DAY_PENALTY,
    }))
    .sort((a, b) => a.score - b.score)
    .map((s) => s.p);

  const result: T[] = [first];
  while (scored.length) {
    const prev = result[result.length - 1];
    const prev2 = result[result.length - 2];
    const fits = (p: T) =>
      p.topic !== prev.topic &&
      !(prev2 && publicationKind(prev2) === publicationKind(prev) && publicationKind(p) === publicationKind(prev));
    let pick = scored.slice(0, LOOKAHEAD).findIndex(fits);
    // Sinon, la plus proche publication d'un autre sujet, même plus loin.
    if (pick < 0) pick = scored.findIndex((p) => p.topic !== prev.topic);
    if (pick >= 0) {
      result.push(scored.splice(pick, 1)[0]);
      continue;
    }
    // Ne restent que des publications de ce sujet : les glisser plus haut, entre deux autres sujets.
    for (const p of scored.splice(0)) {
      const gap = result.findIndex((q, i) => i > 0 && q.topic !== p.topic && result[i - 1].topic !== p.topic);
      if (gap > 0) result.splice(gap, 0, p);
      else result.push(p);
    }
  }
  return result;
}
