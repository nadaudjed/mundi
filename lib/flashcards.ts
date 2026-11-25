import { formatValue, type StatCard } from "./data-cards";
import { publicationKey, publicationPath } from "./publication-links";
import { publicationKind, type PublicationKind } from "./publication-kind";
import type { TopicSlug } from "./types";
import type { FeedPublication } from "./verified";

/**
 * Cartes mémoire de « Réviser », fabriquées automatiquement à chaque publication :
 * - « idees » : les trois idées à retenir (toujours, une par publication) ;
 * - « question » : les questions / réponses écrites par les agents (champ `flashcards`) ;
 * - « chiffre » : le chiffre clé d'une carte de données sourcée (2 au plus).
 * Rien n'est inventé : chaque réponse vient mot pour mot de la publication.
 */
export type ReviewCard = {
  /** Clé de progression : la carte « idées » garde la clé historique de la publication. */
  key: string;
  type: "idees" | "question" | "chiffre";
  question: string;
  /** Une réponse courte, ou la liste des trois idées. */
  answer: string | readonly string[];
  /** Précision affichée sous la réponse (contexte, source du chiffre). */
  detail?: string;
  title: string;
  topic: TopicSlug;
  kind: PublicationKind;
  href: string;
  aiVerified?: boolean;
};

const MAX_FIGURES = 2;
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function reviewCards(p: FeedPublication): ReviewCard[] {
  const base = { title: p.title, topic: p.topic, kind: publicationKind(p), href: publicationPath(p.slug), aiVerified: p.aiVerified };
  const key = publicationKey(p.slug);
  const cards: ReviewCard[] = [{
    ...base, key, type: "idees",
    question: p.title.trim().endsWith("?") ? p.title : "Quelles sont les trois idées à retenir ?",
    answer: p.keyPoints,
  }];
  (p.flashcards ?? []).forEach((c, i) => cards.push({ ...base, key: `${key}#q${i + 1}`, type: "question", question: c.question, answer: c.answer }));
  // Pilote « Aujourd'hui » : la question du décryptage, avec sa réponse expliquée (clé à part :
  // la progression des cartes existantes ne bouge pas).
  const quiz = p.decryptage?.quiz;
  if (quiz) cards.push({ ...base, key: `${key}#decryptage`, type: "question", question: quiz.question, answer: quiz.answer, detail: quiz.explanation });
  (p.dataCards ?? [])
    .filter((c): c is StatCard => c.kind === "stat")
    .slice(0, MAX_FIGURES)
    .forEach((c, i) => {
      const m = c.measure;
      cards.push({
        ...base, key: `${key}#c${i + 1}`, type: "chiffre",
        question: `${upperFirst(m.label)}${m.denominator ? ` ${m.denominator}` : ""} (${m.scope}, ${m.period}) : quel est le chiffre ?`,
        answer: `${formatValue(m)} ${m.unit}`,
        detail: [c.context, `Source : ${c.source.label}`].filter(Boolean).join(" · "),
      });
    });
  return cards;
}
