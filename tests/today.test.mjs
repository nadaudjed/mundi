import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selectToday, missingFromSelection, twoSentences } from "../lib/today.ts";
import { validateDecryptage } from "../lib/decryptage.ts";

const pub = (slug, publishedAt) => ({ slug, publishedAt });
const list = [pub("a", "2026-11-20"), pub("b", "2026-11-25"), pub("c", "2026-11-24"), pub("d", "2026-11-23")];

test("Aujourd'hui : la sélection de la rédaction, dans son ordre, trois sujets au plus", () => {
  const picks = selectToday(list, { selection: ["d", "a", "c", "b"] });
  assert.deepEqual(picks.map((p) => [p.publication.slug, p.reason]), [["d", "selection"], ["a", "selection"], ["c", "selection"]]);
});

test("Aujourd'hui : un sujet retiré ou en double est ignoré, et la sélection de secours complète avec le plus récent", () => {
  const picks = selectToday(list, { selection: ["a", "retire", "a"] });
  assert.deepEqual(picks.map((p) => [p.publication.slug, p.reason]), [["a", "selection"], ["b", "secours"], ["c", "secours"]]);
  assert.deepEqual(missingFromSelection(list.map((p) => p.slug), { selection: ["a", "retire"] }), ["retire"]);
});

test("Aujourd'hui : sans sélection, les trois plus récentes ; moins de trois publications, toutes", () => {
  assert.deepEqual(selectToday(list, { selection: [] }).map((p) => p.publication.slug), ["b", "c", "d"]);
  assert.equal(selectToday(list.slice(0, 2), { selection: [] }).length, 2);
});

test("deux phrases au plus pour une carte sans décryptage", () => {
  assert.equal(twoSentences("Un. Deux ! Trois ? Quatre."), "Un. Deux !");
});

test("les décryptages du pilote sont valides et rattachés à des articles publiés", () => {
  const pubs = JSON.parse(readFileSync("content/publications.json", "utf8"));
  const all = JSON.parse(readFileSync("content/decryptages.json", "utf8"));
  const today = JSON.parse(readFileSync("content/aujourdhui.json", "utf8"));
  for (const [slug, d] of Object.entries(all)) {
    const p = pubs.find((x) => x.slug === slug);
    assert.ok(p, `article introuvable : ${slug}`);
    assert.deepEqual(validateDecryptage(slug, d, p.sources.length), []);
  }
  assert.ok(today.selection.length <= 3);
  for (const slug of today.selection) assert.ok(all[slug], `sujet du jour sans décryptage : ${slug}`);
});

test("un chiffre sans source de l'article, ou trois phrases dans l'essentiel, sont refusés", () => {
  const all = JSON.parse(readFileSync("content/decryptages.json", "utf8"));
  const [slug, d] = Object.entries(all)[0];
  const bad = { ...d, figures: [{ ...d.figures[0], source: 99 }], essentiel: { fait: "Une phrase assez longue pour passer. Et une autre.", consequence: d.essentiel.consequence } };
  const errors = validateDecryptage(slug, bad, 2).join(" ");
  assert.match(errors, /chiffre/);
  assert.match(errors, /deux phrases/);
});
