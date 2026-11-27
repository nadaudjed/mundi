/**
 * Édition « Aujourd'hui » : trois sujets au plus en tête du Fil.
 *
 * La rédaction choisit les sujets par identifiant (content/aujourdhui.json). La sélection :
 * - ignore un identifiant inconnu ou retiré du site (il n'est plus dans les publications) ;
 * - ignore les doublons ;
 * - complète avec les publications les plus récentes quand il en manque (sélection de secours).
 * Fonction pure : le même résultat au build, dans le navigateur et dans les tests.
 */
export type TodayConfig = { edition: string; title: string; intro?: string; selection: string[]; selectedBy?: string };

/** selection : choisi par la rédaction ; secours : complété automatiquement ; actualite : actualité récente ajoutée (#125). */
export type TodayPick<T> = { publication: T; reason: "selection" | "secours" | "actualite" };

export const TODAY_SIZE = 3;

export function selectToday<T extends { slug: string; publishedAt: string }>(
  publications: readonly T[],
  config: Pick<TodayConfig, "selection">,
  size = TODAY_SIZE,
): TodayPick<T>[] {
  const bySlug = new Map(publications.map((p) => [p.slug, p]));
  const picks: TodayPick<T>[] = [];
  const used = new Set<string>();
  for (const slug of config.selection ?? []) {
    const p = bySlug.get(slug);
    if (!p || used.has(slug)) continue;
    used.add(slug);
    picks.push({ publication: p, reason: "selection" });
    if (picks.length === size) return picks;
  }
  const recent = [...publications].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  for (const p of recent) {
    if (picks.length === size) break;
    if (used.has(p.slug)) continue;
    used.add(p.slug);
    picks.push({ publication: p, reason: "secours" });
  }
  return picks;
}

/** Fuseau de référence de l'édition : le jour change à minuit, heure de Paris. */
export const EDITION_TIME_ZONE = "Europe/Paris";

/** Date du jour (AAAA-MM-JJ) à Paris pour un instant donné. */
export function parisDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: EDITION_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/**
 * État de l'édition (#125) :
 * - a-jour : la sélection de la rédaction est datée d'aujourd'hui (heure de Paris) ;
 * - perimee : la sélection date d'un jour précédent ET des publications plus récentes existent :
 *   repli explicite sur les publications les plus récentes, une actualité en tête ;
 * - sans-nouveaute : la sélection date d'un jour précédent mais rien n'a été publié depuis :
 *   on la garde, présentée comme l'édition de sa date (jamais comme celle du jour) ;
 * - automatique : aucune sélection configurée.
 */
export type TodayState = "a-jour" | "perimee" | "sans-nouveaute" | "automatique";

export type ResolvedToday<T> = {
  state: TodayState;
  /** Date de l'édition affichée : celle de la rédaction, ou celle des publications les plus récentes en repli. */
  edition: string;
  /** Date de la sélection de la rédaction, si elle existe. */
  selectionDate?: string;
  /** Aujourd'hui, à Paris, au moment du calcul. */
  today: string;
  picks: TodayPick<T>[];
};

type Dated = { slug: string; publishedAt: string; kind?: string; eventDate?: string };

const byRecency = <T extends Dated>(list: readonly T[]) =>
  [...list].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || (b.eventDate ?? "").localeCompare(a.eventDate ?? ""));

/** L'actualité la plus récente (date de publication, puis date du fait). */
export function latestNews<T extends Dated>(publications: readonly T[]): T | undefined {
  return byRecency(publications.filter((p) => p.kind === "actualite"))[0];
}

/**
 * Édition affichée, selon la date du jour à Paris. Fonction pure : `now` est fourni par l'appelant
 * (date du build pour les pages, horloge simulée dans les tests).
 */
export function resolveToday<T extends Dated>(
  publications: readonly T[],
  config: Pick<TodayConfig, "edition" | "selection"> | null,
  now: Date,
  size = TODAY_SIZE,
): ResolvedToday<T> {
  const today = parisDate(now);
  const newest = byRecency(publications)[0]?.publishedAt;
  const news = latestNews(publications);
  // Repli : les publications les plus récentes, une actualité en tête quand il y en a une.
  const recent = (): TodayPick<T>[] =>
    selectToday(publications, { selection: news ? [news.slug] : [] }, size).map((p) => ({ ...p, reason: p.publication === news ? "actualite" : "secours" }));
  if (!config) return { state: "automatique", edition: newest ?? today, today, picks: recent() };
  const base = { selectionDate: config.edition, today };
  if (config.edition >= today) {
    // Sélection du jour : la rédaction décide (l'ordre et le choix des sujets sont respectés).
    const picks = selectToday(publications, config, size);
    return { ...base, state: "a-jour", edition: config.edition, picks };
  }
  if (newest && newest > config.edition) return { ...base, state: "perimee", edition: newest, picks: recent() };
  return { ...base, state: "sans-nouveaute", edition: config.edition, picks: selectToday(publications, config, size) };
}

/** Ce qui manque dans la sélection, pour le contrôle éditorial. */
export function missingFromSelection(slugs: readonly string[], config: Pick<TodayConfig, "selection">): string[] {
  const known = new Set(slugs);
  return [...new Set(config.selection ?? [])].filter((s) => !known.has(s));
}

/** Les deux phrases de la carte : le fait et sa conséquence, ou à défaut les deux premières phrases du résumé. */
export function twoSentences(summary: string): string {
  const parts = summary.trim().match(/[^.!?…]+(?:[.!?…]+|$)\s*/g) ?? [summary];
  return parts.slice(0, 2).join("").trim();
}
