import { test } from "node:test";
import assert from "node:assert/strict";
import { editionName, planEdition, validSubscription } from "../lib/push-edition.mjs";

const items = [{ slug: "b", title: "Deuxième" }, { slug: "a", title: "Premier" }];

test("premier passage : mémorise sans notifier", () => {
  const r = planEdition(null, items, new Date("2026-11-24T09:40:00Z"));
  assert.equal(r.message, null);
  assert.deepEqual(r.state.slugs, ["b", "a"]);
});

test("nouvelles publications le matin : « L'édition du matin est en ligne »", () => {
  const r = planEdition({ slugs: ["a"] }, items, new Date("2026-11-24T09:40:00Z"));
  assert.equal(r.message.title, "MUNDI · L'édition du matin est en ligne");
  assert.equal(r.message.body, "Deuxième");
  assert.equal(r.state.lastNotifiedAt, "2026-11-24T09:40:00.000Z");
});

test("plusieurs articles l'après-midi : nombre et premier titre", () => {
  const r = planEdition({ slugs: [] , lastNotifiedAt: "2026-11-24T09:40:00Z" }, items, new Date("2026-11-24T14:05:00Z"));
  assert.equal(r.message.title, "MUNDI · L'édition de l'après-midi est en ligne");
  assert.equal(r.message.body, "2 nouveaux articles, dont : Deuxième");
});

test("rien de nouveau (photo, audio) ou moins d'une heure après : aucune notification", () => {
  assert.equal(planEdition({ slugs: ["a", "b"] }, items, new Date()).message, null);
  const r = planEdition({ slugs: ["a"], lastNotifiedAt: "2026-11-24T09:40:00Z" }, items, new Date("2026-11-24T10:10:00Z"));
  assert.equal(r.message, null);
  assert.deepEqual(r.state.slugs, ["b", "a"]);
  assert.equal(r.state.lastNotifiedAt, "2026-11-24T09:40:00Z");
});

test("heure de Paris (hiver UTC+1)", () => {
  assert.equal(editionName(new Date("2026-11-24T10:59:00Z")), "du matin");
  assert.equal(editionName(new Date("2026-11-24T11:00:00Z")), "de l'après-midi");
  assert.equal(editionName(new Date("2026-11-24T17:30:00Z")), "du soir");
});

test("abonnement : HTTPS et clés obligatoires", () => {
  assert.ok(validSubscription({ endpoint: "https://push.example/abc", keys: { p256dh: "x", auth: "y" } }));
  assert.ok(!validSubscription({ endpoint: "http://push.example/abc", keys: { p256dh: "x", auth: "y" } }));
  assert.ok(!validSubscription({ endpoint: "https://push.example/abc" }));
  assert.ok(!validSubscription(null));
});
