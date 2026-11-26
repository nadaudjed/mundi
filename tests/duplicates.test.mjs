import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { duplicateCheck, primaryIds, normalizeSourceUrl, catalogueDuplicates } from "../scripts/duplicate-guard.mjs";
import { blockers } from "../scripts/autopublish-agents.mjs";

const catalogue = JSON.parse(readFileSync("content/publications.json", "utf8"));
const REF = "parfums-industriels-bruxelles-inflige-471-9-millions-d-euros-a-trois-geants-du";
const OLD = "parfums-bruxelles-inflige-471-9-millions-d-euros-d-amende-a-firmenich-givaudan";

test("identifiants de sources primaires normalisés : IP/26/2574 = ip_26_2574, langue du portail ignorée", () => {
  assert.ok(primaryIds({ sources: [{ label: "Communiqué IP/26/2574", url: "https://x.test/a" }] }).has("ec:ip/26/2574"));
  assert.ok(primaryIds({ sources: [{ label: "x", url: "https://ec.europa.eu/commission/presscorner/detail/fr/ip_26_2574" }] }).has("ec:ip/26/2574"));
  assert.equal(
    normalizeSourceUrl("http://www.ec.europa.eu/commission/presscorner/detail/en/ip_26_2574/?utm_source=x#top"),
    normalizeSourceUrl("https://ec.europa.eu/commission/presscorner/detail/fr/ip_26_2574"),
  );
  // La revue de presse quotidienne (MEX) couvre plusieurs sujets : ce n'est pas une source primaire.
  assert.equal(primaryIds({ sources: [{ label: "MEX/26/2595", url: "https://ec.europa.eu/commission/presscorner/detail/en/mex_26_2595" }] }).size, 0);
});

test("le doublon des parfums du 26/11 aurait été mis en attente avant publication", () => {
  const ref = catalogue.find((p) => p.slug === REF);
  const old = catalogue.find((p) => p.slug === OLD);
  const v = duplicateCheck(old, [ref]);
  assert.equal(v.level, "doublon");
  assert.ok(v.sharedIds.includes("ec:ip/26/2574"));
  // Et par le circuit de publication automatique.
  const output = {
    checker: { verdict: "pass", independentlyChecked: true, uncertainties: [] },
    assessment: { status: "machine_checked_pending_policy" },
    draft: { ...old, topic: "entreprises", sections: [{ kind: "fait", heading: "Fait", text: "Un texte suffisamment long pour être valide ici." }, { kind: "analyse", heading: "Analyse", text: "Un second texte suffisamment long pour être valide." }], sources: [...old.sources, { label: "CMA", url: "https://www.gov.uk/cma-cases/x" }] },
  };
  const reasons = blockers(output, [ref]);
  assert.ok(reasons.some((r) => /en attente : doublon manifeste/.test(r)), reasons.join(" ; "));
});

test("une source commune seule déclenche une revue, sans bloquer un angle distinct", () => {
  const a = { slug: "a", title: "Bruxelles prolonge les aides d'État liées à la crise de l'énergie", summary: "La Commission prolonge jusqu'en juin 2027 l'encadrement temporaire des aides.", publishedAt: "2026-11-26", sources: [{ label: "Déclaration SPEECH/26/2589", url: "https://ec.europa.eu/commission/presscorner/detail/en/speech_26_2589" }] };
  const b = { slug: "b", title: "Parfums : amende record contre trois fournisseurs", summary: "Firmenich, Givaudan et IFF sanctionnés pour une entente sur les prix.", publishedAt: "2026-11-26", sources: [{ label: "Déclaration", url: "https://ec.europa.eu/commission/presscorner/detail/fr/speech_26_2589" }] };
  assert.equal(duplicateCheck(b, [a]).level, "revue");
  assert.equal(duplicateCheck({ ...b, sources: [{ label: "x", url: "https://autre.test/y" }] }, [a]), null);
});

test("un article retiré pour doublon ne peut pas revenir : le catalogue retiré est aussi comparé", () => {
  const old = catalogue.find((p) => p.slug === OLD);
  assert.equal(old.status, "withdrawn");
  assert.equal(old.replacedBy, REF);
  assert.equal(duplicateCheck({ ...old, slug: "nouvelle-version" }, [old]).level, "doublon");
});

test("plus aucun doublon manifeste parmi les publications en ligne", () => {
  assert.deepEqual(catalogueDuplicates(catalogue), []);
});

test("redirections : chaque article fusionné mène à une publication en ligne, dans le site et dans netlify.toml", () => {
  const redirections = JSON.parse(readFileSync("content/redirections.json", "utf8"));
  const toml = readFileSync("netlify.toml", "utf8");
  const live = new Set(catalogue.filter((p) => p.status === "published").map((p) => p.slug));
  for (const p of catalogue.filter((x) => x.status === "withdrawn" && x.replacedBy)) {
    const r = redirections.find((x) => x.from === p.slug);
    assert.ok(r && r.to === p.replacedBy, "redirection manquante : " + p.slug);
    assert.ok(live.has(r.to), "la référence n'est pas en ligne : " + r.to);
    assert.ok(toml.includes(`from = "/actualites/${p.slug}/*"`) && toml.includes(`to = "/actualites/${r.to}/"`), "netlify.toml : " + p.slug);
  }
  for (const r of redirections) assert.ok(!live.has(r.from), "une adresse redirigée est encore en ligne : " + r.from);
});
