import test from "node:test";
import assert from "node:assert/strict";
import { cleanData, decodeLink, encodeLink, isEmpty, makePackage, mergeData, parsePackage, readLocal, summary, toStorage } from "../lib/transfer.ts";

/** Faux localStorage d'une origine (Netlify ou Cloudflare), avec les schémas réels du site. */
const storage = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, v), map: m };
};
const netlify = storage({
  "mundi:bookmarks": JSON.stringify(["actualite:cobalt-quotas", "actualite:parfums-bruxelles-inflige-471-9-millions-d-euros-d-amende-a-firmenich-givaudan", 42]),
  "mundi:follows:v1": JSON.stringify({ "cobalt-congolais": { followedAt: "2026-11-20T10:00:00.000Z", seen: ["u1", "u2"], simulated: [{ id: "simulation-1" }] } }),
  "mundi:topics:v1": JSON.stringify(["energie", "afrique", "inconnu"]),
  "mundi:revision:v1": JSON.stringify({ "cobalt-quotas": { level: 3, nextAt: "2026-12-01T00:00:00.000Z", lastAt: "2026-11-24T08:00:00.000Z" }, bad: { level: 9, nextAt: "x", lastAt: "y" } }),
  "mundi:theme": "dark",
  "mundi:intro:v2": "1795000000000",
  "mundi:feed-seed": "7",
});

test("lecture : les clés réelles sont reprises, les valeurs invalides et les mises à jour simulées écartées", () => {
  const d = readLocal(netlify.get);
  assert.deepEqual(d["mundi:bookmarks"], ["actualite:cobalt-quotas", "actualite:parfums-bruxelles-inflige-471-9-millions-d-euros-d-amende-a-firmenich-givaudan"]);
  assert.deepEqual(d["mundi:follows:v1"], { "cobalt-congolais": { followedAt: "2026-11-20T10:00:00.000Z", seen: ["u1", "u2"] } });
  assert.deepEqual(d["mundi:topics:v1"], ["energie", "afrique"]);
  assert.deepEqual(Object.keys(d["mundi:revision:v1"]), ["cobalt-quotas"]);
  assert.equal(d["mundi:theme"], "dark");
  assert.equal(d["mundi:feed-seed"], undefined, "les repères d'onglet ne voyagent pas");
  assert.deepEqual(summary(d), { bookmarks: 2, follows: 1, topics: 2, revision: 1, theme: "dark" });
});

test("lien : le paquet survit à l'aller (Netlify) et au retour (Cloudflare), accents compris", () => {
  const pkg = makePackage(readLocal(netlify.get), "https://mundiapptest.netlify.app", new Date("2026-11-27T15:00:00Z"));
  const link = encodeLink(pkg);
  assert.match(link, /^[A-Za-z0-9_-]+$/, "base64url : rien à échapper dans l'adresse");
  assert.deepEqual(decodeLink(link), pkg);
  assert.equal(decodeLink("pas-un-paquet"), null);
  assert.equal(parsePackage(JSON.stringify({ format: "autre", version: 1, data: {} })), null);
  assert.equal(parsePackage(JSON.stringify({ ...pkg, version: 2 })), null);
});

test("import sur Cloudflare : fusion avec l'existant, sans doublon à la deuxième importation", () => {
  const cloudflare = storage({
    "mundi:bookmarks": JSON.stringify(["actualite:deja-la", "actualite:cobalt-quotas"]),
    "mundi:follows:v1": JSON.stringify({ "cobalt-congolais": { followedAt: "2026-11-26T10:00:00.000Z", seen: ["u3"] } }),
    "mundi:revision:v1": JSON.stringify({ "cobalt-quotas": { level: 1, nextAt: "2026-11-28T00:00:00.000Z", lastAt: "2026-11-27T09:00:00.000Z" } }),
    "mundi:theme": "light",
  });
  const incoming = parsePackage(JSON.stringify(makePackage(readLocal(netlify.get), "https://mundiapptest.netlify.app"))).data;
  const apply = () => { for (const [k, v] of toStorage(mergeData(readLocal(cloudflare.get), incoming))) cloudflare.set(k, v); };
  apply();
  const once = readLocal(cloudflare.get);
  assert.deepEqual(once["mundi:bookmarks"], ["actualite:deja-la", "actualite:cobalt-quotas", "actualite:parfums-bruxelles-inflige-471-9-millions-d-euros-d-amende-a-firmenich-givaudan"]);
  assert.deepEqual(once["mundi:follows:v1"]["cobalt-congolais"], { followedAt: "2026-11-20T10:00:00.000Z", seen: ["u3", "u1", "u2"] });
  assert.equal(once["mundi:revision:v1"]["cobalt-quotas"].level, 1, "la révision la plus récente (Cloudflare) l'emporte");
  assert.equal(once["mundi:theme"], "light", "le réglage déjà présent l'emporte");
  assert.deepEqual(once["mundi:topics:v1"], ["energie", "afrique"]);
  apply();
  assert.deepEqual(readLocal(cloudflare.get), once, "deuxième import : rien ne change");
  // Format de stockage identique au site : JSON pour les listes, texte brut pour le thème.
  assert.equal(cloudflare.map.get("mundi:theme"), "light");
  assert.doesNotThrow(() => JSON.parse(cloudflare.map.get("mundi:follows:v1")));
});

test("navigateur vide : rien à emporter ; données corrompues : ignorées sans erreur", () => {
  assert.ok(isEmpty(readLocal(storage({ "mundi:intro:v2": "1" }).get)));
  assert.deepEqual(readLocal(storage({ "mundi:bookmarks": "{oops", "mundi:follows:v1": "[]" }).get), {});
  assert.deepEqual(cleanData(null), {});
  assert.deepEqual(readLocal(() => { throw new Error("bloqué"); }), {});
});
