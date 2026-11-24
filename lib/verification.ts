/**
 * Libellé de contrôle affiché au lecteur : une seule formulation partout
 * (fil, listes, page article, révision, enregistrés).
 * Une publication validée par une personne garde la mention « Validation humaine ».
 */
export const AI_CHECK_LABEL = "Contrôle IA, sans relecture humaine";
export const HUMAN_CHECK_LABEL = "Validation humaine";

export function verificationLabel(p: { aiVerified?: boolean }): string {
  return p.aiVerified ? AI_CHECK_LABEL : HUMAN_CHECK_LABEL;
}
