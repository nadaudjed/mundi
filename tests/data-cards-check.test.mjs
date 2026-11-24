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
