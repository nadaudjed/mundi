import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboard, renderHtml } from "../scripts/ops-dashboard.mjs";

const now = Date.parse("2026-11-25T12:00:00Z");
const stock = { items: [{ sourceId: "usgs", topicHint: "materiaux-critiques", publishedAt: "2026-11-24T10:00:00Z" }],
  latestCollection: { at: "2026-11-25T06:30:00Z", newCount: 3, sourceHealth: [
    { sourceId: "usgs", status: "ok", count: 1 }, { sourceId: "un", status: "error", count: 0, error: "HTTP 503" }] } };
const day = (date, extra = {}) => ({ format: "mundi-agent-day-v1", date, target: 20, completed: 12, generated: 8, machineChecked: 3,
  configuration: { ready: true }, usage: { calls: 30, webSearches: 50, estimatedUsd: 2.5 },
  outputs: [{ role: "journalist", topic: "energie", error: "Claude web search reported an error (unavailable)" },
    { role: "professor", topic: "afrique", draft: { title: "Une filière" }, assessment: { status: "needs_human_or_more_research", reasons: ["Checker withheld approval"] } }], ...extra });

test("healthy days produce counts, costs and only real alerts", () => {
  const d = buildDashboard({ stock, days: [day("2026-11-25")], now,
    publications: [{ status: "published", aiVerified: true, publishedAt: "2026-11-25", topic: "energie" }] });
  assert.equal(d.leads.sourcesOk, 1);
  assert.equal(d.agents.days[0].published, 1);
  assert.equal(d.agents.days[0].rejected, 1);
  assert.equal(d.agents.totals.apiCalls, 30);
  assert.equal(d.library.topicsCovered, 1);
  assert.deepEqual(d.alerts, ["Source un : error — HTTP 503."]);
  assert.match(renderHtml(d), /web search reported an error/);
});

test("stale collection, silent agents, overspend and a stale Netlify site raise alerts", () => {
  const d = buildDashboard({ now, budgetUsd: 1,
    stock: { ...stock, latestCollection: { ...stock.latestCollection, at: "2026-11-23T06:00:00Z", sourceHealth: [] } },
    days: [day("2026-11-23", { generated: 0 })],
    smoke: { ok: false, results: [{ ok: false, path: "/actualites/x/", error: "HTTP 404" }] } });
  const all = d.alerts.join("\n");
  assert.match(all, /Dernière collecte RSS il y a 54 h/);
  assert.match(all, /tâche quotidienne semble arrêtée/);
  assert.match(all, /aucun brouillon produit/);
  assert.match(all, /au-dessus du seuil/);
  assert.match(all, /Netlify n'affiche pas/);
});

test("HTML escapes agent-written text", () => {
  const d = buildDashboard({ stock, now, days: [day("2026-11-25", { outputs: [{ role: "journalist", topic: "x", error: "<script>alert(1)</script>" }] })] });
  assert.ok(!renderHtml(d).includes("<script>alert"));
});
