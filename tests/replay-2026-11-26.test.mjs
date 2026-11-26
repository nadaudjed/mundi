/**
 * #125, commentaire « Prévention durable » : le lot du 26/11 rejoué tel qu'il a été publié
 * (six passages, 40 articles, tests/fixtures/lot-2026-11-26), puis relancé.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { replay } from "../scripts/batch-report.mjs";
import { insertBatch } from "../scripts/catalogue-insert.mjs";
import { duplicateCheck } from "../scripts/duplicate-guard.mjs";
import { subjectConflict, matchesAtWordStart, queryPlan, protectReviewed, namesSubject, visualKind } from "../scripts/collect-editorial-images.mjs";

const DIR = "tests/fixtures/lot-2026-11-26";
const REF = "parfums-industriels-bruxelles-inflige-471-9-millions-d-euros-a-trois-geants-du";
const OLD = "parfums-bruxelles-inflige-471-9-millions-d-euros-d-amende-a-firmenich-givaudan";
const AMOCO = "amoco-cadiz-1978-la-maree-noire-qui-a-souille-360-km-de-cotes-bretonnes";
const base = JSON.parse(readFileSync(DIR + "/catalogue-avant.json", "utf8"));
const lots = JSON.parse(readFileSync(DIR + "/lots.json", "utf8"));
const item = (slug) => lots.flatMap((l) => l.items).find((p) => p.slug === slug);
const reviews = JSON.parse(readFileSync("content/editorial-image-reviews.json", "utf8")).items;

let result;
test.before(async () => { result = await replay(DIR, { now: new Date("2026-11-27T08:00:00+01:00") }); });

test("rejeu : le doublon des parfums est retenu, avec une proposition d'enrichir l'article de référence", () => {
  assert.deepEqual(result.first.held.map((h) => h.slug), [OLD]);
  const h = result.first.held[0];
  assert.equal(h.proposal.target, REF);
  assert.ok(h.compared.sharedIds.includes("ec:ip/26/2574"));
  assert.ok(h.compared.sharedEntities.includes("firmenich"));
  assert.equal(result.first.inserted.length, 39);
  assert.ok(!result.catalogue.some((p) => p.slug === OLD));
});

test("rejeu : deux angles légitimes sur une même source sont publiés, avec une revue demandée", () => {
  const energie = result.first.review.find((r) => r.slug.startsWith("energie-bruxelles-prolonge"));
  assert.ok(energie, "l'article sur les aides d'État cite le même discours que celui sur les parfums");
  assert.ok(result.first.inserted.includes(energie.slug));
  // Un concept et une actualité qui citent le même communiqué ne sont pas le même fait.
  const concept = { slug: "comment-bruxelles-calcule-une-amende", kind: "concept", title: "Comment Bruxelles calcule une amende pour entente", summary: "La Commission part de la valeur des ventes, puis ajuste selon la gravité et la durée, comme pour Firmenich et Givaudan.", publishedAt: "2026-11-26", sources: item(REF).sources };
  assert.equal(duplicateCheck(concept, [item(REF)]).level, "revue");
});

test("relance du même lot : rien n'est créé", () => {
  assert.equal(result.rerun.inserted.length, 0);
  assert.equal(result.rerun.already.length, 39);
  assert.deepEqual(result.rerun.held.map((h) => h.slug), [OLD]);
});

test("deux lots simultanés : chacun passe seul, le second est retenu au recontrôle avant écriture", () => {
  const a = insertBatch([item(REF)], base), b = insertBatch([item(OLD)], base);
  assert.equal(a.inserted.length, 1);
  assert.equal(b.inserted.length, 1, "vérifiés en parallèle, aucun ne voit l'autre");
  // publish-to-main.sh rejoue le lot sur le main le plus récent : le lot A y est déjà.
  const replayB = insertBatch([item(OLD)], a.catalogue);
  assert.equal(replayB.inserted.length, 0);
  assert.equal(replayB.log[0].decision, "en attente");
});

test("une entrée défectueuse est bloquée seule, le reste du lot continue", () => {
  const r = insertBatch([{ title: "sans slug" }, item(AMOCO)], base);
  assert.deepEqual(r.inserted, [AMOCO]);
  assert.equal(r.log[0].decision, "bloqué");
});

test("rejeu des photos : seule l'ancre de l'Amoco Cadiz est publiée, toutes les photos retirées sont refusées", () => {
  const added = result.first.photos.added.map((x) => x.slug);
  assert.deepEqual(added, [AMOCO]);
  const retired = reviews.filter((r) => r.status === "retiree" && !r.slug.includes("-carte-")).map((r) => r.slug);
  for (const slug of retired) assert.ok(!added.includes(slug), slug);
  const helsinki = result.first.photos.review.find((x) => x.slug.startsWith("helsinki"));
  assert.match(helsinki.candidate.conflict, /époque différente/);
});

test("pertinence : lieu en conflit, déclencheur au milieu d'un mot, mot ambigu", () => {
  const debt = { title: "Dette publique : la zone euro sous pression", summary: "Les États européens empruntent davantage." };
  assert.match(subjectConflict(debt, { title: "Nepal budget speech 2023.jpg" }), /lieu différent/);
  assert.equal(subjectConflict(debt, { title: "European Central Bank Frankfurt.jpg" }), null);
  assert.equal(matchesAtWordStart(/vents?/i, "une faillite qui arrive souvent"), false);
  assert.equal(matchesAtWordStart(/mine/i, "ce qui détermine le prix"), false);
  assert.equal(matchesAtWordStart(/mine/i, "une mine de cuivre"), true);
  assert.ok(queryPlan({ title: "Comment fonctionne une franchise", topic: "entreprises" }).every((q) => q.strength === "faible"));
  assert.ok(queryPlan({ title: "Le vent fait tourner les éoliennes", topic: "energie" }).every((q) => q.strength === "faible"));
  const amoco = item(AMOCO);
  assert.ok(namesSubject(amoco, { title: "Amoco Cadiz anchor.jpg" }));
  assert.ok(!namesSubject(amoco, { title: "Oil tanker at sea.jpg" }));
  assert.equal(visualKind({ title: "Helsinki, 1er août 1975" }, { title: "Helsinki conference 1975.jpg" }), "archive");
  assert.equal(visualKind(amoco, { title: "Amoco Cadiz anchor.jpg" }), "illustration");
});

test("un visuel validé par la rédaction n'est jamais remplacé automatiquement, crédit et licence compris", () => {
  const kept = { slug: AMOCO, src: "/media/editorial/a.jpg", credit: "Zubro", license: "CC BY-SA 3.0", alt: "Ancre de l'Amoco Cadiz" };
  const review = new Map([[AMOCO, { status: "conservee" }]]);
  const changed = protectReviewed([kept], { images: [{ ...kept, credit: "Autre", src: "/media/editorial/b.jpg" }], report: [] }, review);
  assert.deepEqual(changed.images, [kept]);
  assert.equal(changed.report[0].status, "protected_by_review");
  const removed = protectReviewed([kept], { images: [], report: [] }, review);
  assert.deepEqual(removed.images, [kept]);
});

test("le lendemain : la sélection du 25/11 est périmée, l'accueil prend les publications du 26/11 avec une actualité en tête", () => {
  const t = result.first.today;
  assert.equal(t.today, "2026-11-27");
  assert.equal(t.state, "perimee");
  assert.equal(t.edition, "2026-11-26");
  assert.equal(t.picks[0].reason, "actualite");
  assert.ok(t.picks.every((p) => p.publication.publishedAt === "2026-11-26"));
  assert.ok(!t.picks.some((p) => p.publication.slug === OLD));
});
