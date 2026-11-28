import type { DataCard, Measure } from "./data-cards";

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

/**
 * Couverture MUNDI pour une publication sans photo pertinente (ticket 136).
 * Quatre traitements, par ordre de pertinence :
 * - « chiffre » : la valeur structurée et sourcée de keyFigureOf (jamais extraite du texte) ;
 * - « date » : récit dont l'année est fournie (cover.date) ou inscrite dans le titre approuvé ;
 * - « concept » : notion durable, motif abstrait de la rubrique ;
 * - « actualite » : composition typographique avec le motif et la couleur de la rubrique.
 * Les motifs sont décoratifs : aucune information factuelle n'y est portée.
 */
export type CoverTreatment = "chiffre" | "date" | "concept" | "actualite";
/** Choix explicite facultatif dans les données (ex. un titre à la une). */
export type CoverHint = { treatment?: CoverTreatment; date?: string; word?: string };
export type Cover = {
  treatment: CoverTreatment;
  figure?: KeyFigure;
  /** Année ou période du fait (récit daté). */
  date?: string;
  /** Mot-clé éditorial court fourni dans les données (jamais deviné). */
  word?: string;
  /** Variation stable de composition (0, 1 ou 2), tirée de l'identifiant. */
  variant: 0 | 1 | 2;
};

type Coverable = { slug: string; title: string; kind?: "actualite" | "concept" | "recit"; dataCards?: DataCard[]; cover?: CoverHint };

/**
 * Année (1000–2099) ou période « 1977-1978 » écrite dans le titre approuvé : une seule,
 * sinon rien. Les nombres à virgule (« 13,3 ») et les montants ne sont pas pris.
 */
export function yearInTitle(title: string): string | undefined {
  const found = new Set<string>();
  const re = /(?<!\d|\d[,.])(1\d{3}|20\d{2})(?:\s?[-–]\s?(1\d{3}|20\d{2}))?(?!\d|[,.]\d)/g;
  for (const m of title.matchAll(re)) found.add(m[2] ? `${m[1]}–${m[2]}` : m[1]);
  return found.size === 1 ? [...found][0] : undefined;
}

/** Petite empreinte stable d'un identifiant, pour varier les compositions sans hasard. */
export function stableVariant(id: string): 0 | 1 | 2 {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 3) as 0 | 1 | 2;
}

export function coverOf(p: Coverable): Cover {
  const variant = stableVariant(p.slug);
  const hint = p.cover ?? {};
  const word = hint.word?.trim() || undefined;
  const figure = keyFigureOf(p);
  const date = hint.date?.trim() || (p.kind === "recit" ? yearInTitle(p.title) : undefined);
  const explicit = hint.treatment;
  if (explicit === "chiffre" && figure) return { treatment: "chiffre", figure, variant };
  if (explicit === "date" && date) return { treatment: "date", date, variant };
  if (explicit === "concept" || explicit === "actualite") return { treatment: explicit, word, variant };
  if (figure) return { treatment: "chiffre", figure, variant };
  if (p.kind === "recit" && date) return { treatment: "date", date, variant };
  if (p.kind === "concept" || p.kind === "recit") return { treatment: "concept", word, variant };
  return { treatment: "actualite", word, variant };
}
