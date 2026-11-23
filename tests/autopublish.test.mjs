import test from "node:test";
import assert from "node:assert/strict";
import { autopublish, blockers, slugify, AI_REVIEWER } from "../scripts/autopublish-agents.mjs";

const draft = (over = {}) => ({
  topic: "recyclage", contentType: "today",
  title: "Le recyclage des emballages progresse en Europe en 2024",
  summary: "Un résumé suffisamment long pour décrire les chiffres publiés et leurs limites.",
  keyPoints: ["Premier point vérifiable du brouillon.", "Deuxième point vérifiable du brouillon.", "Troisième point vérifiable du brouillon."],
  sections: [
    { kind: "fait", heading: "Ce que disent les chiffres", text: "Un texte de section suffisamment long pour être valide ici." },
    { kind: "analyse", heading: "Pourquoi c'est important", text: "Un second texte de section suffisamment long pour être valide." },
  ],
  sources: [{ label: "Eurostat", url: "https://ec.europa.eu/eurostat/x" }, { label: "Agence", url: "https://www.eea.europa.int/y" }],
  claims: [],
  ...over,
});
const output = (over = {}, d = draft()) => ({
  id: "a1", topic: d.topic, draft: d,
  checker: { verdict: "pass", sensitiveFlags: [], uncertainties: [] },
  assessment: { status: "machine_checked_pending_policy", sensitive: false },
  ...over,
});
const ok = async () => ({ ok: true });
const results = (outputs) => ({ date: "2026-11-24", outputs });

test("a fully checked, non-sensitive draft with live links is published, labelled as AI-verified", async () => {
  const { published, decisions } = await autopublish(results([output()]), [], { fetcher: ok });
  assert.equal(published.length, 1);
  const p = published[0];
  assert.equal(p.slug, "le-recyclage-des-emballages-progresse-en-europe-en-2024");
  assert.equal(p.status, "published");
  assert.equal(p.aiVerified, true);
  assert.equal(p.reviewedBy, AI_REVIEWER);
  assert.ok(!/fondateur|humain\b(?!e)/i.test(p.reviewedBy.replace("sans relecture humaine", "")), "never claims a human review");
  assert.equal(p.publishedAt, "2026-11-24");
  assert.equal(decisions[0].decision, "publié");
});

test("nothing is published when the checker did not approve", async () => {
  const o = output({ assessment: { status: "needs_human_or_more_research", sensitive: false } });
  assert.equal((await autopublish(results([o]), [], { fetcher: ok })).published.length, 0);
  assert.match(blockers(output({ checker: { verdict: "pass", sensitiveFlags: [], uncertainties: ["a", "b", "c", "d", "e", "f"] } }), []).join(), /incertitudes/);
});

test("sensitive subjects are published when sourced and approved (founder's decision)", async () => {
  const war = draft({ topic: "geopolitique", title: "Guerre et élections : ce que disent les sources officielles" });
  const o = output({ assessment: { status: "machine_checked_pending_policy", sensitive: true }, checker: { verdict: "pass", sensitiveFlags: ["conflit armé"], uncertainties: [] } }, war);
  assert.deepEqual(blockers(o, []), []);
  assert.equal((await autopublish(results([o]), [], { fetcher: ok })).published.length, 1);
});

test("broken links, a single source organisation and duplicates block publication", async () => {
  const dead = async (url) => ({ ok: !url.includes("eea") });
  assert.equal((await autopublish(results([output()]), [], { fetcher: dead })).published.length, 0);
  const sameOrg = draft({ sources: [{ label: "Source A", url: "https://ec.europa.eu/a" }, { label: "Source B", url: "https://ec.europa.eu/b" }] });
  assert.match(blockers(output({}, sameOrg), []).join(), /deux organismes/);
  const existing = [{ slug: "autre", title: draft().title, sources: [] }];
  assert.match(blockers(output(), existing).join(), /doublon/);
});

test("kill switch and daily cap", async () => {
  assert.equal((await autopublish(results([output()]), [], { enabled: false, fetcher: ok })).published.length, 0);
  const two = [output({ id: "a" }), output({ id: "b" }, draft({ title: "Un autre titre de test sur le recyclage du verre", sources: [{ label: "Source C", url: "https://www.ademe.fr/c" }, { label: "Source D", url: "https://www.citeo.com/d" }] }))];
  assert.equal((await autopublish(results(two), [], { max: 1, fetcher: ok })).published.length, 1);
});

test("slugs are ASCII and cut on a whole word", () => {
  assert.equal(slugify("Énergie : l’éolien en mer, ça avance ?"), "energie-l-eolien-en-mer-ca-avance");
  assert.ok(slugify("mot ".repeat(40)).length <= 80);
  assert.ok(!slugify("mot ".repeat(40)).endsWith("-"));
});
