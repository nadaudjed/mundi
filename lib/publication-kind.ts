/**
 * Genre d'une publication : « actualite » (écrite par un journaliste : ce qui vient
 * de changer) ou « concept » (écrit par un professeur : une notion durable).
 * Sans valeur, une publication est traitée comme une actualité.
 */
export type PublicationKind = "actualite" | "concept";

export const publicationKind = (p: { kind?: PublicationKind }): PublicationKind => p.kind ?? "actualite";

export const KIND_LABEL: Record<PublicationKind, string> = { actualite: "Actualité", concept: "Concept" };
