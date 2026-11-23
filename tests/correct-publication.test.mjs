import test from "node:test";
import assert from "node:assert/strict";
import { applyCorrection } from "../scripts/correct-publication.mjs";

const pub = { slug: "a-b", status: "published", publishedAt: "2026-11-23", updatedAt: "2026-11-23", title: "T" };
test("a correction is appended, dated and visible; nothing else changes", () => {
  const [p] = applyCorrection([pub], { slug: "a-b", action: "corriger", note: "Le chiffre de 2024 était 2,3 Mt et non 2,5 Mt.", date: "2026-11-24" });
  assert.equal(p.status, "published");
  assert.equal(p.updatedAt, "2026-11-24");
  assert.equal(p.corrections.length, 1);
});
test("withdrawal hides the article but keeps the record", () => {
  const [p] = applyCorrection([pub], { slug: "a-b", action: "retirer", note: "Source principale démentie par l'organisme.", date: "2026-11-24" });
  assert.equal(p.status, "withdrawn");
  assert.equal(p.title, "T");
});
test("unknown article, empty reason or unknown action are refused", () => {
  assert.throws(() => applyCorrection([pub], { slug: "x", action: "retirer", note: "raison suffisante", date: "2026-11-24" }), /Aucun article/);
  assert.throws(() => applyCorrection([pub], { slug: "a-b", action: "retirer", note: "", date: "2026-11-24" }), /Explique/);
  assert.throws(() => applyCorrection([pub], { slug: "a-b", action: "supprimer", note: "raison suffisante", date: "2026-11-24" }), /Action inconnue/);
});
