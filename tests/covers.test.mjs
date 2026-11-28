import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { coverOf, stableVariant, yearInTitle } from "../lib/covers.ts";

/** Couvertures MUNDI des contenus sans photo (ticket 136). */
const stat = { id: "c1", kind: "stat", measure: { value: 35, unit: "€", label: "Paiement moyen", scope: "Zone euro", period: "2026" }, source: { label: "BCE", url: "https://www.ecb.europa.eu/" }, asOf: "2026-11-25" };

test("année d'un récit : une seule année ou période du titre, jamais un montant", () => {
  assert.equal(yearInTitle("Herstatt, 26 juin 1974 : la faillite qui a fait naître le Comité de Bâle"), "1974");
  assert.equal(yearInTitle("1960, l'année de l'Afrique : 17 indépendances en douze mois"), "1960");
  assert.equal(yearInTitle("Shaba, 1977-1978 : la guerre minière qui a fait flamber le cobalt"), "1977–1978");
  assert.equal(yearInTitle("Plan Marshall : comment 13,3 milliards de dollars ont relancé l'Europe"), undefined);
  assert.equal(yearInTitle("De 1971 à 1973, le choc"), undefined, "deux années distinctes : pas de choix arbitraire");
  assert.equal(yearInTitle("Le prix atteint 2 500,5 euros"), undefined);
});

test("ordre des traitements : chiffre sourcé, récit daté, concept, actualité", () => {
  assert.equal(coverOf({ slug: "a", title: "Spoutnik, 1957", kind: "recit", dataCards: [stat] }).treatment, "chiffre");
  assert.equal(coverOf({ slug: "b", title: "Herstatt, 26 juin 1974", kind: "recit" }).treatment, "date");
  assert.equal(coverOf({ slug: "b", title: "Herstatt, 26 juin 1974", kind: "recit" }).date, "1974");
  assert.equal(coverOf({ slug: "c", title: "Variole : comment le monde a éradiqué une maladie", kind: "recit" }).treatment, "concept");
  assert.equal(coverOf({ slug: "d", title: "Comment fonctionne une franchise", kind: "concept" }).treatment, "concept");
  assert.equal(coverOf({ slug: "e", title: "Sortie du gaz : l'État publie son guide", kind: "actualite" }).treatment, "actualite");
  assert.equal(coverOf({ slug: "f", title: "Sans genre précisé" }).treatment, "actualite");
});

test("un choix explicite dans les données l'emporte, s'il a de quoi s'afficher", () => {
  assert.equal(coverOf({ slug: "g", title: "Variole", kind: "recit", cover: { date: "1980" } }).date, "1980");
  assert.equal(coverOf({ slug: "h", title: "Un récit de 1974", kind: "recit", dataCards: [stat], cover: { treatment: "date" } }).treatment, "date");
  assert.equal(coverOf({ slug: "i", title: "Sans date", kind: "recit", cover: { treatment: "date" } }).treatment, "concept", "pas de date : pas de couverture datée");
  assert.equal(coverOf({ slug: "j", title: "Actualité", kind: "actualite", cover: { word: "Hydrogène" } }).word, "Hydrogène");
  assert.equal(coverOf({ slug: "k", title: "Actualité", kind: "actualite" }).word, undefined, "aucun mot-clé deviné");
});

test("variation stable par identifiant", () => {
  assert.equal(stableVariant("herstatt"), stableVariant("herstatt"));
  const all = new Set(Array.from({ length: 30 }, (_, i) => stableVariant(`sujet-${i}`)));
  assert.deepEqual([...all].sort(), [0, 1, 2]);
});

test("toutes les publications en ligne trouvent une couverture", () => {
  const published = JSON.parse(readFileSync("content/publications.json", "utf8")).filter((p) => p.status === "published");
  for (const p of published) assert.ok(["chiffre", "date", "concept", "actualite"].includes(coverOf(p).treatment), p.slug);
});
