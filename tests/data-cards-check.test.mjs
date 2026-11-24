import test from "node:test";
import assert from "node:assert/strict";
import { dataCardErrors, publishableCards, cleanCard } from "../scripts/data-cards-check.mjs";

const src = "https://www.insee.fr/fr/statistiques/1";
const m = (value, label) => ({ value, unit: "%", label, scope: "France", period: "2025", denominator: "de la population active" });
const cards = [
  { id: "chomage", kind: "stat", headline: "Le chômage reste stable", measure: m(7.4, "Taux de chômage"), source: { label: "Insee", url: src }, asOf: "2026-11-01", visual: "x" },
  { id: "compare", kind: "comparaison", headline: "Hommes et femmes", presentation: "echelle-commune", items: [m(7.2, "Hommes"), m(7.6, "Femmes")], source: { label: "Insee", url: src }, asOf: "2026-11-01" },
];
const draft = { sources: [{ url: src }], dataCards: cards };

test("cartes valides conservées et nettoyées", () => {
  const out = publishableCards(draft);
  assert.equal(out.length, 2);
  assert.equal(out[0].visual, undefined);
  assert.deepEqual(dataCardErrors(out, [src]), []);
});

test("carte avec une source hors article retirée", () => {
  const bad = { ...draft, dataCards: [cards[0], { ...cards[1], source: { label: "Autre", url: "https://exemple.org/x" } }] };
  assert.equal(publishableCards(bad), undefined);
  assert.ok(dataCardErrors(bad.dataCards.map(cleanCard), [src]).some((e) => e.includes("sources de l'article")));
});

test("pourcentage sans dénominateur ou échelle commune mixte refusés", () => {
  const noDen = { ...cards[0], measure: { ...cards[0].measure, denominator: undefined } };
  assert.ok(dataCardErrors([noDen, cards[1]], [src]).some((e) => e.includes("dénominateur")));
  const mixed = { ...cards[1], items: [m(7.2, "Hommes"), { ...m(30, "Salaire"), unit: "k€", denominator: undefined }] };
  assert.ok(dataCardErrors([cards[0], mixed], [src]).some((e) => e.includes("échelle commune")));
});

test("pas de cartes : rien n'est ajouté", () => {
  assert.equal(publishableCards({ sources: [] }), undefined);
});

import { flashcardErrors, publishableFlashcards } from "../scripts/data-cards-check.mjs";
import { toPublication } from "../scripts/autopublish-agents.mjs";

test("cartes mémoire : format du site respecté, cartes invalides retirées", () => {
  const ok = [{ question: "Qui a découvert la pénicilline ?", answer: "Alexander Fleming, en 1928." }];
  assert.deepEqual(flashcardErrors(ok), []);
  assert.deepEqual(publishableFlashcards({ flashcards: ok }), ok);
  assert.ok(flashcardErrors([{ question: "Sans point d'interrogation", answer: "Oui" }]).some((e) => e.includes("« ? »")));
  assert.equal(publishableFlashcards({ flashcards: [{ question: "Trop court ?", answer: "x" }] }), undefined);
  assert.equal(publishableFlashcards({ flashcards: Array(7).fill(ok[0]) }), undefined);
  assert.equal(publishableFlashcards({}), undefined);
});

test("publication : cartes mémoire transmises seulement si valides", () => {
  const draft = { title: "Un titre", summary: "Résumé", topic: "science", keyPoints: ["a"], sections: [], sources: [],
    flashcards: [{ question: "Qui a découvert la pénicilline ?", answer: "Alexander Fleming, en 1928." }] };
  assert.equal(toPublication({ draft, role: "professor" }, "2026-11-24").flashcards.length, 1);
  assert.equal(toPublication({ draft: { ...draft, flashcards: [{ question: "?", answer: "" }] }, role: "professor" }, "2026-11-24").flashcards, undefined);
});

test("cartes « Données » publiées seulement pour les articles prévus, avec leur recherche de photo", async () => {
  const { toPublication, dataCardsAllowed } = await import("../scripts/autopublish-agents.mjs");
  const d = { title: "Un titre", summary: "Résumé assez long pour passer.", topic: "economie", keyPoints: ["a", "b", "c"], sections: [], sources: [{ label: "S", url: src }],
    dataCards: cards.map((c, i) => ({ ...c, imageQuery: i ? "  gas   meter " : "stock exchange" })) };
  const yes = toPublication({ draft: d, role: "journalist", dataCardsAllowed: true }, "2026-11-24");
  assert.equal(yes.dataCards.length, 2);
  assert.deepEqual(yes.dataCards.map((c) => c.imageQuery), ["stock exchange", "gas meter"]);
  assert.equal(toPublication({ draft: d, role: "journalist", dataCardsAllowed: false }, "2026-11-24").dataCards, undefined);
  // Ancien brouillon sans indication : tirage stable sur le titre, environ un sur trois.
  const share = Array.from({ length: 300 }, (_, i) => dataCardsAllowed({ draft: { title: "Titre " + i } })).filter(Boolean).length;
  assert.ok(share > 70 && share < 130, String(share));
});
