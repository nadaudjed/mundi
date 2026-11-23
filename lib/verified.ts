import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateDataCards, type DataCard } from "./data-cards";
import { publishedArticles, validatePublication, type Publication } from "./editorial";

/**
 * Publications vérifiées affichées par le site (fil, liste, pages, enregistrés).
 *
 * En temps normal : uniquement `publishedArticles` (content/publications.json,
 * validé par lib/editorial.ts). Les brouillons n'y figurent jamais.
 *
 * Pour les tests de bout en bout seulement : la variable
 * `MUNDI_TEST_PUBLICATIONS` peut désigner un fichier de publications
 * INVENTÉES (tests/fixtures/). Garde-fous :
 * - refusé sur Netlify (préproduction comme production) ;
 * - chaque entrée doit passer la même validation que les vraies publications ;
 * - chaque slug doit commencer par « test- » et chaque source pointer vers
 *   le domaine réservé « .test », qui n'existe pas sur Internet.
 * Ce fichier ne doit être lu que côté serveur, au moment de la construction.
 */
/** `dataCards` : séquence facultative de 2 à 4 cartes de données (lib/data-cards.ts). */
export type VerifiedPublication = Publication & { fixture?: true; dataCards?: DataCard[] };

/** Données utiles au fil et aux enregistrements (sans le corps de l'article). */
export type FeedPublication = Omit<VerifiedPublication, "sections">;

function loadTestFixtures(file: string): VerifiedPublication[] {
  if (process.env.NETLIFY || process.env.CONTEXT) {
    throw new Error("MUNDI_TEST_PUBLICATIONS est réservé aux tests locaux et ne peut pas être utilisé sur Netlify.");
  }
  const items = JSON.parse(readFileSync(resolve(process.cwd(), file), "utf8")) as unknown[];
  return items.map((item, i) => {
    const errors = validatePublication(item);
    const p = item as Publication;
    if (!p.slug?.startsWith("test-")) errors.push("le slug doit commencer par « test- »");
    if (!p.sources?.every((s) => new URL(s.url).hostname.endsWith(".test"))) errors.push("les sources doivent utiliser le domaine réservé .test");
    const cards = (item as VerifiedPublication).dataCards;
    if (cards && !cards.every((c) => new URL(c.source.url).hostname.endsWith(".test"))) errors.push("les sources des cartes de données doivent utiliser le domaine .test");
    if (errors.length) throw new Error(`Fixture de test n°${i + 1} invalide : ${errors.join(", ")}`);
    return { ...p, fixture: true as const };
  });
}

const testFile = process.env.MUNDI_TEST_PUBLICATIONS;

/**
 * Une publication approuvée dont les cartes de données sont mal formées fait
 * échouer la construction : mieux vaut un build rouge qu'un chiffre sans unité,
 * sans source ou avec une comparaison trompeuse.
 */
function checkDataCards(list: VerifiedPublication[]): VerifiedPublication[] {
  for (const p of list) {
    if (p.dataCards === undefined) continue;
    const errors = validateDataCards(p.dataCards);
    if (errors.length) throw new Error(`Cartes de données invalides pour « ${p.slug} » : ${errors.join(" ; ")}`);
  }
  return list;
}

export const verifiedPublications: VerifiedPublication[] = checkDataCards(
  testFile ? loadTestFixtures(testFile).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)) : publishedArticles,
);

export const getVerifiedPublication = (slug: string) => verifiedPublications.find((p) => p.slug === slug);

export function toFeedPublication({ sections: _sections, ...rest }: VerifiedPublication): FeedPublication {
  void _sections;
  return rest;
}

export const feedPublications: FeedPublication[] = verifiedPublications.map(toFeedPublication);
