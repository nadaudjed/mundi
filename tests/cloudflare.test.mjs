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
