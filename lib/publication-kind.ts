/**
 * Genre d'une publication : « actualite » (écrite par un journaliste : ce qui vient
 * de changer), « concept » (écrit par un professeur : une notion durable) ou « recit »
 * (une histoire vraie, un épisode historique, une idée, reliés à l'actualité).
 * Sans valeur, une publication est traitée comme une actualité.
 */
export type PublicationKind = "actualite" | "concept" | "recit";

export const publicationKind = (p: { kind?: PublicationKind }): PublicationKind => p.kind ?? "actualite";

export const KIND_LABEL: Record<PublicationKind, string> = { actualite: "Actualité", concept: "Concept", recit: "Récit" };
