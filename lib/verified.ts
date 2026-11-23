import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateDataCards, type DataCard } from "./data-cards";
import { publishedArticles, validatePublication, type Publication } from "./editorial";
import approvedScenes from "@/content/scenes.json";
import editorialImages from "@/content/editorial-images.json";
import {existsSync} from "node:fs";
import {validateEditorialPhotos,type EditorialPhoto} from "./editorial-images";
import { validateBackdrops, type SceneBackdrop, type SceneRef } from "./scenes";

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
/** `scene` : fond plein écran facultatif, choisi dans le registre approuvé (lib/scenes.ts). */
export type VerifiedPublication = Publication & {
  fixture?: true;
  photo?: EditorialPhoto;
  dataCards?: DataCard[];
  scene?: SceneRef;
  /** Fonds approuvés utilisés par la publication et ses cartes, résolus au build. */
  backdrops?: Record<string, SceneBackdrop>;
};

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
const testScenes = process.env.MUNDI_TEST_SCENES;

/**
 * Registre des fonds : content/scenes.json (fonds approuvés par le fondateur),
 * ou, pour les tests seulement, un registre INVENTÉ (MUNDI_TEST_SCENES), refusé sur Netlify.
 */
function loadBackdrops(): SceneBackdrop[] {
  let list: unknown = approvedScenes;
  if (testScenes) {
    if (process.env.NETLIFY || process.env.CONTEXT) throw new Error("MUNDI_TEST_SCENES est réservé aux tests locaux et ne peut pas être utilisé sur Netlify.");
    list = JSON.parse(readFileSync(resolve(process.cwd(), testScenes), "utf8"));
    if (!(list as SceneBackdrop[]).every((b) => b?.id?.startsWith("test-"))) throw new Error("Les fonds de test doivent avoir un identifiant commençant par « test- »");
  }
  const errors = validateBackdrops(list);
  if (errors.length) throw new Error(`Registre des scènes invalide : ${errors.join(" ; ")}`);
  return list as SceneBackdrop[];
}

/**
 * Chaque fond demandé doit figurer au registre approuvé : sinon la construction
 * échoue. Un fond non approuvé ne peut donc jamais apparaître sur le site.
 */
function resolveScenes(list: VerifiedPublication[]): VerifiedPublication[] {
  const registry = new Map(loadBackdrops().map((b) => [b.id, b]));
  return list.map((p) => {
    const refs = [p.scene, ...(p.dataCards ?? []).map((c) => c.scene)].filter((r): r is SceneRef => Boolean(r));
    if (refs.length === 0) return p;
    const backdrops: Record<string, SceneBackdrop> = {};
    for (const r of refs) {
      const b = registry.get(r?.backdrop);
      if (!b) throw new Error(`Fond « ${r?.backdrop} » demandé par « ${p.slug} » : absent du registre des fonds approuvés (content/scenes.json)`);
      if (r.focus !== undefined && !["haut", "centre", "bas"].includes(r.focus)) throw new Error(`Cadrage de fond invalide pour « ${p.slug} »`);
      backdrops[b.id] = b;
    }
    return { ...p, backdrops };
  });
}

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

function attachEditorialPhotos(list:VerifiedPublication[]):VerifiedPublication[]{
  // Test fixtures never borrow photos from the actual MUNDI production catalogue.
  if(testFile)return list;
  const errors=validateEditorialPhotos(editorialImages);
  if(errors.length)throw new Error("Catalogue de photos : "+errors.join(" ; "));
  const bySlug=new Map((editorialImages as EditorialPhoto[]).map(p=>[p.slug,p]));
  for(const photo of bySlug.values()){
    if(!existsSync(resolve(process.cwd(),"public"+photo.src)))
      throw new Error("Photographie référencée mais introuvable : "+photo.src);
  }
  return list.map(p=>({ ...p, ...(bySlug.has(p.slug)?{photo:bySlug.get(p.slug)}:{})}));
}
export const verifiedPublications: VerifiedPublication[] = resolveScenes(
  checkDataCards(attachEditorialPhotos(testFile ? loadTestFixtures(testFile).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)) : publishedArticles)),
);

export const getVerifiedPublication = (slug: string) => verifiedPublications.find((p) => p.slug === slug);

export function toFeedPublication({ sections: _sections, ...rest }: VerifiedPublication): FeedPublication {
  void _sections;
  return rest;
}

export const feedPublications: FeedPublication[] = verifiedPublications.map(toFeedPublication);
