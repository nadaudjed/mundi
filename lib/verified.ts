import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateDataCards, type DataCard } from "./data-cards";
import { publishedArticles, validatePublication, type Publication } from "./editorial";
import approvedScenes from "@/content/scenes.json";
import editorialImages from "@/content/editorial-images.json";
import {existsSync} from "node:fs";
import {validateEditorialPhotos,type EditorialPhoto} from "./editorial-images";
import { validateBackdrops, type SceneBackdrop, type SceneRef } from "./scenes";
import { attachArticleAudio } from "./article-audio";
import decryptageData from "@/content/decryptages.json";
import todayData from "@/content/aujourdhui.json";
import { validateDecryptage, type Decryptage } from "./decryptage";
import type { TodayConfig } from "./today";

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
  /** Fichier MP3 de la version audio, s'il est prêt. */
  audio?: string;
  /** Durée du MP3, en secondes. */
  audioDuration?: number;
  dataCards?: DataCard[];
  /**
   * false : les chiffres restent dans l'article, la couverture et Réviser, mais la série de cartes
   * n'apparaît pas dans le fil (tous les articles ne sont pas « en cartes », pour varier).
   */
  dataCardsInFeed?: boolean;
  /** Photo propre à chaque carte du fil, par identifiant de carte (jamais la photo de l'article). */
  cardPhotos?: Record<string, EditorialPhoto>;
  scene?: SceneRef;
  /** Fonds approuvés utilisés par la publication et ses cartes, résolus au build. */
  backdrops?: Record<string, SceneBackdrop>;
  /** Pilote « Aujourd'hui » : décryptage en trois niveaux (content/decryptages.json). */
  decryptage?: Decryptage;
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
  // Photos des cartes « Données » : rangées à part dans le catalogue (publication + carte).
  const byCard=new Map<string,Record<string,EditorialPhoto>>();
  for(const photo of editorialImages as EditorialPhoto[]){
    if(!photo.publication||!photo.card)continue;
    byCard.set(photo.publication,{...byCard.get(photo.publication),[photo.card]:photo});
  }
  return list.map(p=>{
    const own=byCard.get(p.slug);
    const cards=own&&Object.fromEntries(Object.entries(own).filter(([id,ph])=>(p.dataCards??[]).some(c=>c.id===id)&&ph.sourceUrl!==bySlug.get(p.slug)?.sourceUrl));
    return { ...p, ...(bySlug.has(p.slug)?{photo:bySlug.get(p.slug)}:{}), ...(cards&&Object.keys(cards).length?{cardPhotos:cards}:{})};
  });
}
const testDecryptages = process.env.MUNDI_TEST_DECRYPTAGES;
const testToday = process.env.MUNDI_TEST_TODAY;
function testOnly(file: string): unknown {
  if (process.env.NETLIFY || process.env.CONTEXT) throw new Error("Les fichiers de test du pilote sont réservés aux tests locaux.");
  return JSON.parse(readFileSync(resolve(process.cwd(), file), "utf8"));
}

/**
 * Décryptages du pilote : une entrée mal formée fait échouer la construction. Un lien vers
 * un article retiré est simplement retiré (repli), sans casser la page.
 */
function attachDecryptages(list: VerifiedPublication[]): VerifiedPublication[] {
  // Le site de test ne reçoit jamais les décryptages des vrais articles (et inversement).
  const all = (testDecryptages ? testOnly(testDecryptages) : testFile ? {} : decryptageData) as Record<string, Decryptage>;
  const slugs = new Set(list.map((p) => p.slug));
  const errors: string[] = [];
  const result = list.map((p) => {
    const d = all[p.slug];
    if (!d) return p;
    errors.push(...validateDecryptage(p.slug, d, p.sources.length));
    const link = d.link && slugs.has(d.link.slug) && d.link.slug !== p.slug ? d.link : undefined;
    return { ...p, decryptage: { ...d, link } };
  });
  if (errors.length) throw new Error("Décryptages invalides : " + errors.join(" ; "));
  return result;
}

export const verifiedPublications: VerifiedPublication[] = attachDecryptages(attachArticleAudio(resolveScenes(
  checkDataCards(attachEditorialPhotos(testFile ? loadTestFixtures(testFile).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)) : publishedArticles)),
)));

/**
 * Configuration de l'édition « Aujourd'hui ». Le site de test (publications inventées) n'a
 * pas d'édition du jour, sauf configuration inventée (MUNDI_TEST_TODAY) : ses scénarios
 * historiques gardent ainsi le fil tel quel.
 */
export const todayConfig: TodayConfig | null = (testToday ? testOnly(testToday) : testFile ? null : todayData) as TodayConfig | null;

export const getVerifiedPublication = (slug: string) => verifiedPublications.find((p) => p.slug === slug);

export function toFeedPublication({ sections: _sections, ...rest }: VerifiedPublication): FeedPublication {
  void _sections;
  // Le script parlé ne sert qu'à fabriquer le MP3 : inutile dans le navigateur.
  if (rest.decryptage) {
    const { audioScript: _script, ...decryptage } = rest.decryptage;
    void _script;
    return { ...rest, decryptage };
  }
  return rest;
}

export const feedPublications: FeedPublication[] = verifiedPublications.map(toFeedPublication);
