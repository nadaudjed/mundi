import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { netlifyRedirects, redirectsFile } from "../scripts/cloudflare-files.mjs";

test("Cloudflare Pages : toutes les redirections de netlify.toml passent dans _redirects", () => {
  const rules = netlifyRedirects(readFileSync("netlify.toml", "utf8"));
  const merged = JSON.parse(readFileSync("content/redirections.json", "utf8"));
  for (const r of merged) assert.ok(rules.some((x) => x.from.startsWith(`/actualites/${r.from}`) && x.to === `/actualites/${r.to}/` && x.status === 301), r.from);
  assert.ok(rules.some((x) => x.from === "/recit/*" && x.to === "/explorer/"));
  const file = redirectsFile(rules);
  assert.equal(file.trim().split("\n").filter((l) => !l.startsWith("#")).length, rules.length);
  assert.match(file, /^\/recit\/\* \/explorer\/ 301$/m);
});

test("les workflows lisent le stock éditorial par le remote « stock », jamais par la branche du dépôt public", () => {
  for (const f of ["max-publish", "agent-newsroom", "editorial-inbox", "ops-dashboard"]) {
    const y = readFileSync(`.github/workflows/${f}.yml`, "utf8");
    assert.ok(y.includes("scripts/stock-remote.sh"), f);
    assert.doesNotMatch(y, /origin\/editorial-stock|origin refs\/heads\/editorial-stock|push origin HEAD:refs\/heads\/editorial-stock/, f);
  }
});

import { legacyRules, legacyHome, versionInfo, LEGACY_HOME } from "../scripts/cloudflare-files.mjs";

test("Ancienne adresse Netlify (#129) : chaque page va à la même page de l'adresse officielle, transfert gardé", () => {
  const internal = netlifyRedirects(readFileSync("netlify.toml", "utf8"));
  const rules = legacyRules(internal);
  const site = "https://mundi.nadaudjacques004.workers.dev";
  const last = rules.at(-1);
  assert.deepEqual(last, { from: "/*", to: `${site}/:splat`, status: "302!" }, "redirection générale temporaire pendant la transition");
  // Ordre : l'aiguillage de l'accueil et la page de transfert passent avant la redirection générale.
  const at = (from) => rules.findIndex((r) => r.from === from);
  assert.ok(at("/") < at("/*") && at("/transfert/*") < at("/*") && at("/_next/*") < at("/*"));
  assert.deepEqual(rules[at("/")], { from: "/", to: LEGACY_HOME, status: "200!" });
  assert.equal(rules[at("/transfert/*")].status, 200, "sans « ! » : Netlify sert la page existante");
  // Article fusionné : directement à la publication de référence, en un seul saut, sur l'adresse officielle.
  const merged = JSON.parse(readFileSync("content/redirections.json", "utf8"));
  for (const m of merged) assert.ok(rules.some((r) => r.from === `/actualites/${m.from}/*` && r.to === `${site}/actualites/${m.to}/` && r.status === "302!"), m.from);
  assert.ok(rules.some((r) => r.from === "/recit/*" && r.to === `${site}/explorer/`));
  // Aucune règle ne renvoie vers netlify.app (pas de boucle) ; 301 seulement sur demande.
  assert.ok(rules.every((r) => !String(r.to).includes("netlify.app")));
  assert.throws(() => legacyRules(internal, { site: "https://mundiapptest.netlify.app" }), /netlify/);
  assert.equal(legacyRules(internal, { status: 301 }).at(-1).status, "301!");
  assert.throws(() => legacyRules(internal, { status: 307 }));
});

test("Ancienne adresse : l'accueil mène au transfert s'il reste des données, sinon à l'adresse officielle", () => {
  const html = legacyHome();
  assert.match(html, /<link rel="canonical" href="https:\/\/mundi\.nadaudjacques004\.workers\.dev\/">/);
  assert.match(html, /noindex/);
  assert.match(html, /mundi:transfert/);
  for (const k of ["mundi:bookmarks", "mundi:follows:v1", "mundi:topics:v1", "mundi:revision:v1"]) assert.ok(html.includes(k), k);
  assert.match(html, /location\.replace\(d\?"\/transfert\/":t\+"\/"\+location\.search\)/);
});

test("version.json : build, commit et date d'édition (Paris)", () => {
  const v = versionInfo({ WORKERS_CI_COMMIT_SHA: "abc123", WORKERS_CI_BUILD_UUID: "uuid-1", WORKERS_CI_BRANCH: "main" }, new Date("2026-11-27T23:05:00Z"));
  assert.deepEqual({ ...v, builtAt: undefined }, { build: "uuid-1", commit: "abc123", branch: "main", builtAt: undefined, editionDay: "2026-11-28" });
  assert.equal(versionInfo({ MUNDI_BUILD_ID: "refresh-9-1", GITHUB_SHA: "def" }).build, "refresh-9-1");
});

test("Worker : /api/* passe par le code, le reste est servi tel quel ; abonnements dans un Durable Object", () => {
  const w = readFileSync("wrangler.jsonc", "utf8");
  assert.match(w, /"main": "worker\/index\.mjs"/);
  assert.match(w, /"run_worker_first": \["\/api\/\*"\]/);
  assert.match(w, /"new_sqlite_classes": \["PushHub"\]/);
  assert.match(readFileSync("worker/index.mjs", "utf8"), /export class PushHub extends DurableObject/);
});
