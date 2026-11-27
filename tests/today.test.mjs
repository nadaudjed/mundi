import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selectToday, missingFromSelection, twoSentences, resolveToday, parisDate, latestNews } from "../lib/today.ts";
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

/* #125 — édition datée, changement de jour à Paris et repli explicite. */
const cat = [
  { slug: "recit-ancien", publishedAt: "2026-11-24", kind: "recit" },
  { slug: "shaba", publishedAt: "2026-11-25", kind: "recit" },
  { slug: "textiles", publishedAt: "2026-11-25", kind: "concept" },
  { slug: "actu-25", publishedAt: "2026-11-25", kind: "actualite", eventDate: "2026-11-24" },
  { slug: "concept-26", publishedAt: "2026-11-26", kind: "concept" },
  { slug: "actu-26", publishedAt: "2026-11-26", kind: "actualite", eventDate: "2026-11-25" },
];
const config25 = { edition: "2026-11-25", selection: ["shaba", "textiles", "recit-ancien"] };

test("le jour change à minuit heure de Paris, pas à minuit UTC", () => {
  assert.equal(parisDate(new Date("2026-11-25T22:59:59Z")), "2026-11-25"); // 23 h 59 à Paris (UTC+1 en hiver)
  assert.equal(parisDate(new Date("2026-11-25T23:00:00Z")), "2026-11-26"); // minuit à Paris, encore le 25 en UTC
  assert.equal(parisDate(new Date("2026-07-14T22:00:00Z")), "2026-07-15"); // heure d'été (UTC+2)
});

test("le jour de l'édition, la sélection de la rédaction est respectée", () => {
  const r = resolveToday(cat, config25, new Date("2026-11-25T23:30:00+01:00"));
  assert.equal(r.state, "a-jour");
  assert.deepEqual(r.picks.map((p) => [p.publication.slug, p.reason]), [["shaba", "selection"], ["textiles", "selection"], ["recit-ancien", "selection"]]);
});

test("une minute après minuit à Paris, l'édition de la veille est périmée : repli sur le plus récent, une actualité en tête", () => {
  const r = resolveToday(cat, config25, new Date("2026-11-26T00:01:00+01:00"));
  assert.equal(r.state, "perimee");
  assert.equal(r.selectionDate, "2026-11-25");
  assert.equal(r.edition, "2026-11-26");
  assert.deepEqual(r.picks.map((p) => [p.publication.slug, p.reason]), [["actu-26", "actualite"], ["concept-26", "secours"], ["shaba", "secours"]]);
  assert.ok(!r.picks.some((p) => p.reason === "selection"), "une sélection périmée n'est jamais présentée comme choisie pour aujourd'hui");
});

test("sans nouvelle édition ni nouveau contenu, l'ancienne sélection reste, présentée comme l'édition de sa date", () => {
  const old = cat.filter((p) => p.publishedAt <= "2026-11-25");
  const r = resolveToday(old, config25, new Date("2026-11-27T09:00:00+01:00"));
  assert.equal(r.state, "sans-nouveaute");
  assert.equal(r.edition, "2026-11-25");
  assert.deepEqual(r.picks.map((p) => p.publication.slug), ["shaba", "textiles", "recit-ancien"]);
});

test("nouveau contenu sans actualité : repli sur les plus récentes, sans inventer d'actualité", () => {
  const noNews = cat.filter((p) => p.kind !== "actualite");
  const r = resolveToday(noNews, config25, new Date("2026-11-26T10:00:00+01:00"));
  assert.equal(r.state, "perimee");
  assert.equal(r.picks[0].publication.slug, "concept-26");
  assert.equal(latestNews(noNews), undefined);
});

test("sans configuration : les plus récentes, une actualité en tête", () => {
  const r = resolveToday(cat, null, new Date("2026-11-26T10:00:00+01:00"));
  assert.equal(r.state, "automatique");
  assert.equal(r.picks[0].publication.slug, "actu-26");
});

test("l'actualité la plus récente départage par la date du fait à date de publication égale", () => {
  const list = [{ slug: "a", publishedAt: "2026-11-26", kind: "actualite", eventDate: "2026-11-24" }, { slug: "b", publishedAt: "2026-11-26", kind: "actualite", eventDate: "2026-11-25" }];
  assert.equal(latestNews(list).slug, "b");
});

test("édition réelle : sa date est valide et chaque sujet choisi est publié", () => {
  const pubs = JSON.parse(readFileSync("content/publications.json", "utf8")).filter((p) => p.status === "published");
  const today = JSON.parse(readFileSync("content/aujourdhui.json", "utf8"));
  assert.match(today.edition, /^\d{4}-\d{2}-\d{2}$/);
  for (const slug of today.selection) assert.ok(pubs.some((p) => p.slug === slug), "sujet introuvable : " + slug);
  // Le 26/11/2026 au matin, la sélection du 25 passe en repli : une publication du 26 en tête.
  const r = resolveToday(pubs, today, new Date("2026-11-26T15:00:00+01:00"));
  if (today.edition < "2026-11-26") {
    assert.equal(r.state, "perimee");
    assert.equal(r.picks[0].publication.kind, "actualite");
    assert.equal(r.picks[0].publication.publishedAt, "2026-11-26");
  }
});
