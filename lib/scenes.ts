/**
 * Scènes plein écran (ticket #30) : fonds d'ambiance APPROUVÉS, placés derrière
 * le texte d'une publication ou d'une carte de données.
 *
 * Un fond est purement décoratif : il ne porte ni texte, ni chiffre, ni relation
 * causale. Toute l'information reste dans le texte HTML de la carte.
 * La direction artistique (ChatGPT, ticket #26) fournit les fichiers ; ils ne
 * sont inscrits au registre (content/scenes.json) qu'après accord du fondateur.
 */

export const SCENES_FORMAT = "mundi-scenes-v1";

/** Référence à un fond depuis une publication ou une carte. */
export type SceneRef = {
  /** Identifiant d'un fond du registre approuvé. */
  backdrop: string;
  /** Partie de l'image gardée visible sur un écran étroit. Par défaut : centre. */
  focus?: "haut" | "centre" | "bas";
};

/** Fond inscrit au registre après validation humaine. */
export type SceneBackdrop = {
  id: string;
  /** Fichier local : /media/scenes/… (aucun lien vers un site tiers). */
  src: string;
  credit: string;
  license: string;
  /** Personne qui a approuvé la diffusion de ce fond. */
  approvedBy: string;
  /** Date de l'approbation (AAAA-MM-JJ). */
  approvedAt: string;
};

const SRC = /^\/media\/scenes\/[a-z0-9][a-z0-9._-]*\.(svg|webp|avif|jpe?g|png)$/i;
const text = (v: unknown, min = 2) => typeof v === "string" && v.trim().length >= min && v.trim().length <= 160;

/** Validation du registre des fonds approuvés. */
export function validateBackdrops(value: unknown): string[] {
  if (!Array.isArray(value)) return ["Le registre des scènes doit être une liste"];
  const errors: string[] = [];
  const ids = new Set<string>();
  value.forEach((b, i) => {
    const where = `Fond ${i + 1}`;
    const x = (b ?? {}) as Record<string, unknown>;
    if (typeof x.id !== "string" || !/^[a-z0-9-]{2,40}$/.test(x.id) || ids.has(x.id)) errors.push(`${where} : identifiant manquant ou en double`);
    else ids.add(x.id);
    if (typeof x.src !== "string" || !SRC.test(x.src) || x.src.includes("..")) errors.push(`${where} : le fichier doit être local, sous /media/scenes/`);
    if (!text(x.credit) || !text(x.license)) errors.push(`${where} : crédit et licence requis`);
    if (!text(x.approvedBy)) errors.push(`${where} : nom de la personne qui a approuvé requis`);
    if (typeof x.approvedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(x.approvedAt)) errors.push(`${where} : date d'approbation invalide (AAAA-MM-JJ)`);
  });
  return errors;
}

/** Valeur CSS `background-position` correspondant au cadrage demandé. */
export function focusPosition(focus: SceneRef["focus"]): string {
  return focus === "haut" ? "center 20%" : focus === "bas" ? "center 80%" : "center";
}
