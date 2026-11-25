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

export type TodayPick<T> = { publication: T; reason: "selection" | "secours" };

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
