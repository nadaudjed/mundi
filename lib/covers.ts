import type { DataCard, Measure } from "./data-cards";
import { getTopic } from "./topics";
import type { Story } from "./types";

/**
 * Chiffre clé d'une publication : uniquement une donnée déjà structurée et
 * approuvée dans son contenu (première carte « stat »). Rien n'est extrait
 * du texte ni calculé : sans carte de données, pas de chiffre clé.
 */
export type KeyFigure = { measure: Measure; source: { label: string; url: string }; asOf: string };

export function keyFigureOf(p: { dataCards?: DataCard[] }): KeyFigure | undefined {
  const card = p.dataCards?.find((c) => c.kind === "stat");
  if (!card || card.kind !== "stat") return undefined;
  return { measure: card.measure, source: card.source, asOf: card.asOf };
}

/** Mot-clé typographié pour un récit de démonstration : le nom de sa rubrique. */
export function storyKeyword(story: Story): string {
  return getTopic(story.topic)?.name ?? "MUNDI";
}
