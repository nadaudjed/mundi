#!/usr/bin/env node
/**
 * MUNDI — tableau de bord interne de fonctionnement (privé, aucune publication, aucun appel d'IA).
 *
 * Lit : la réserve privée `editorial-stock` (pistes RSS, journées des agents, registre),
 * content/publications.json et, si présent, le rapport de contrôle Netlify.
 * Produit : reports/ops-dashboard.json, reports/ops-dashboard.html et reports/ops-alerts.md.
 * Les alertes signalent une collecte en panne, des agents muets, un site non à jour ou un coût anormal.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

export const TOPICS = ["geopolitique", "economie", "finance", "industrie", "materiaux-critiques", "energie",
  "recyclage", "environnement", "technologie", "entreprises", "afrique", "sciences-societe"];
const HOUR = 3600_000;
const readJson = (p, fallback = null) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return fallback; } };
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ageHours = (iso, now) => { const t = Date.parse(iso || ""); return Number.isFinite(t) ? Math.round((now - t) / HOUR) : null; };

export function buildDashboard({ stock = null, days = [], publications = [], smoke = null, now = Date.now(), budgetUsd = 10 } = {}) {
  const alerts = [];
  // 1. Collecte RSS
  const items = Array.isArray(stock?.items) ? stock.items : [];
  const latest = stock?.latestCollection ?? null;
  const health = Array.isArray(latest?.sourceHealth) ? latest.sourceHealth : [];
  const collectionAge = ageHours(latest?.at, now);
  const leadsByTopic = Object.fromEntries(TOPICS.map((t) => [t, 0]));
  const freshestBySource = {};
  for (const it of items) {
    if (it?.topicHint in leadsByTopic) leadsByTopic[it.topicHint]++;
    const s = it?.sourceId; if (!s) continue;
    if (!freshestBySource[s] || (it.publishedAt || "") > freshestBySource[s]) freshestBySource[s] = it.publishedAt || "";
  }
  const sources = health.map((h) => ({ ...h, freshestItem: freshestBySource[h.sourceId] || null,
    freshestAgeHours: ageHours(freshestBySource[h.sourceId], now) }));
  if (!latest) alerts.push("Aucune collecte RSS enregistrée dans la réserve privée.");
  else if (collectionAge !== null && collectionAge > 30) alerts.push(`Dernière collecte RSS il y a ${collectionAge} h (attendu : chaque jour).`);
  for (const s of sources.filter((x) => x.status !== "ok"))
    alerts.push(`Source ${s.sourceId} : ${s.status}${s.error ? " — " + s.error : ""}.`);
  for (const s of sources.filter((x) => x.status === "ok" && x.freshestAgeHours !== null && x.freshestAgeHours > 24 * 21))
    alerts.push(`Source ${s.sourceId} : aucune nouveauté depuis ${Math.round(s.freshestAgeHours / 24)} jours.`);

  // 2. Agents (une entrée par journée archivée)
  const pubs = Array.isArray(publications) ? publications.filter((p) => p?.status === "published") : [];
  const agentDays = days.filter((d) => d?.format === "mundi-agent-day-v1").sort((a, b) => a.date.localeCompare(b.date)).map((d) => {
    const outputs = Array.isArray(d.outputs) ? d.outputs : [];
    const errors = outputs.filter((o) => o?.error).map((o) => ({ topic: o.topic, role: o.role, error: String(o.error).slice(0, 200) }));
    const rejected = outputs.filter((o) => o?.draft && o?.assessment?.status !== "machine_checked_pending_policy")
      .map((o) => ({ topic: o.topic, title: String(o.draft?.title || "").slice(0, 120), reasons: (o.assessment?.reasons || []).slice(0, 4) }));
    return {
      date: d.date, missions: d.completed ?? outputs.length, target: d.target ?? 24, publishableAgents: d.agentsWithPublishableDraft ?? null,
      journalists: outputs.filter((o) => o?.role === "journalist").length,
      professors: outputs.filter((o) => o?.role && o.role !== "journalist").length,
      drafts: d.generated ?? 0, accepted: d.machineChecked ?? 0, rejected: rejected.length,
      published: pubs.filter((p) => p.aiVerified === true && p.publishedAt === d.date).length,
      usage: d.usage ?? null, configured: d.configuration?.ready === true, errors, rejectedDetails: rejected,
    };
  });
  const last = agentDays.at(-1) ?? null;
  const lastAge = last ? ageHours(last.date + "T12:00:00Z", now) : null;
  if (!last) alerts.push("Aucune journée d'agents archivée.");
  else {
    if (lastAge !== null && lastAge > 36) alerts.push(`Dernière exécution des agents le ${last.date} : la tâche quotidienne semble arrêtée.`);
    if (last.configured && last.missions > 0 && last.drafts === 0) alerts.push(`Agents du ${last.date} : ${last.missions} missions, aucun brouillon produit.`);
    if (last.errors.length >= Math.max(3, Math.ceil(last.missions / 2))) alerts.push(`Agents du ${last.date} : ${last.errors.length} missions en erreur sur ${last.missions}.`);
    if ((last.usage?.estimatedUsd ?? 0) > budgetUsd) alerts.push(`Coût estimé du ${last.date} : ~${last.usage.estimatedUsd} $, au-dessus du seuil de ${budgetUsd} $.`);
  }

  // 3. Bibliothèque publiée
  const byTopic = Object.fromEntries(TOPICS.map((t) => [t, 0]));
  for (const p of pubs) if (p.topic in byTopic) byTopic[p.topic]++;
  const library = { total: pubs.length, aiVerifiedOnly: pubs.filter((p) => p.aiVerified === true).length,
    humanReviewed: pubs.filter((p) => p.aiVerified !== true).length, byTopic,
    topicsCovered: Object.values(byTopic).filter((n) => n > 0).length,
    corrections: pubs.filter((p) => Array.isArray(p.corrections) && p.corrections.length).length };

  // 4. Netlify
  const site = smoke ? { ok: smoke.ok === true, checkedAt: smoke.checkedAt ?? null,
    failures: (smoke.results || []).filter((r) => !r.ok).map((r) => r.path + " " + (r.error || "")) } : null;
  if (site && !site.ok) alerts.push("Netlify n'affiche pas tous les derniers contenus : " + site.failures.join(" ; "));

  const totals = agentDays.reduce((t, d) => {
    for (const k of ["missions", "drafts", "accepted", "rejected", "published"]) t[k] += d[k] || 0;
    if (d.usage) t.measuredDays++;
    t.apiCalls += d.usage?.calls || 0; t.webSearches += d.usage?.webSearches || 0; t.estimatedUsd += d.usage?.estimatedUsd || 0;
    return t;
  }, { missions: 0, drafts: 0, accepted: 0, rejected: 0, published: 0, measuredDays: 0, apiCalls: 0, webSearches: 0, estimatedUsd: 0 });
  totals.estimatedUsd = Math.round(totals.estimatedUsd * 100) / 100;
  return { format: "mundi-ops-dashboard-v1", generatedAt: new Date(now).toISOString(),
    notice: "Tableau interne. Les pistes RSS ne sont pas des articles ; « accepté » signifie validé par le vérificateur IA, sans relecture humaine. Coûts : estimation, la console Anthropic fait foi.",
    leads: { total: items.length, byTopic: leadsByTopic, lastCollectionAt: latest?.at ?? null, lastCollectionAgeHours: collectionAge,
      newInLastCollection: latest?.newCount ?? null, sourcesOk: sources.filter((s) => s.status === "ok").length, sourcesTotal: sources.length, sources },
    agents: { days: agentDays, totals }, library, site, alerts };
}

export function renderHtml(d) {
  const row = (cells) => "<tr>" + cells.map((c) => `<td>${esc(c)}</td>`).join("") + "</tr>";
  const table = (head, rows) => `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MUNDI — fonctionnement</title><style>body{font:15px/1.5 system-ui,sans-serif;margin:16px;max-width:1000px;color:#1b1b1b;background:#fafaf7}
table{border-collapse:collapse;width:100%;margin:8px 0 20px;font-size:14px}td,th{border:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}
th{background:#eee}.alert{background:#fde8e8;border:1px solid #f5a3a3;padding:10px;border-radius:6px}.ok{background:#e7f6ea;border:1px solid #9bd3a6;padding:10px;border-radius:6px}
.wrap{overflow-x:auto}</style></head><body>
<h1>MUNDI — tableau de bord interne</h1><p>${esc(d.notice)}<br>Généré le ${esc(d.generatedAt)}</p>
${d.alerts.length ? `<div class="alert"><strong>${d.alerts.length} alerte(s)</strong><ul>${d.alerts.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>` : `<div class="ok">Aucune alerte.</div>`}
<h2>Réserve de pistes (non vérifiées)</h2><p>${d.leads.total} pistes ; ${d.leads.sourcesOk}/${d.leads.sourcesTotal} sources actives en bon état ; dernière collecte ${esc(d.leads.lastCollectionAt)} (${esc(d.leads.newInLastCollection)} nouvelles).</p>
<div class="wrap">${table(["Source", "État", "Pistes", "Plus récente", "Erreur"], d.leads.sources.map((s) => row([s.sourceId, s.status, s.count, s.freshestItem || "—", s.error || ""])))}</div>
<div class="wrap">${table(["Rubrique", "Pistes", "Articles publiés"], Object.keys(d.leads.byTopic).map((t) => row([t, d.leads.byTopic[t], d.library.byTopic[t]])))}</div>
<h2>Agents</h2><p>Total : ${d.agents.totals.missions} missions, ${d.agents.totals.drafts} brouillons, ${d.agents.totals.accepted} acceptés par le vérificateur, ${d.agents.totals.published} publiés ; ${d.agents.totals.apiCalls} appels API, ${d.agents.totals.webSearches} recherches web, coût estimé ~${d.agents.totals.estimatedUsd} $.</p>
<div class="wrap">${table(["Jour", "Missions (J/P)", "Brouillons", "Acceptés", "Rejetés", "Publiés", "Appels API", "Recherches", "Coût estimé"], d.agents.days.map((x) => row([x.date, `${x.missions} (${x.journalists}/${x.professors})`, x.drafts, x.accepted, x.rejected, x.published, x.usage?.calls ?? "non mesuré", x.usage?.webSearches ?? "—", x.usage ? "~" + x.usage.estimatedUsd + " $" : "non mesuré"])))}</div>
${d.agents.days.slice(-1).map((x) => `<h3>Erreurs et rejets du ${esc(x.date)}</h3><div class="wrap">${table(["Rubrique", "Rôle", "Cause"], [...x.errors.map((e) => row([e.topic, e.role, e.error])), ...x.rejectedDetails.map((r) => row([r.topic, "rejeté", r.title + " — " + r.reasons.join(" ; ")]))])}</div>`).join("")}
<h2>Bibliothèque</h2><p>${d.library.total} articles publiés (${d.library.aiVerifiedOnly} vérifiés par l'IA seulement, ${d.library.humanReviewed} relus par un humain) ; ${d.library.topicsCovered}/12 rubriques couvertes.</p>
<h2>Netlify</h2><p>${d.site ? (d.site.ok ? "Site vérifié : les derniers articles sont en ligne." : "Problème : " + esc(d.site.failures.join(" ; "))) : "Contrôle non exécuté."}</p>
</body></html>`;
}

export function renderAlerts(d) {
  return ["## Alertes MUNDI — " + d.generatedAt.slice(0, 10), "",
    ...d.alerts.map((a) => "- " + a), "",
    `Réserve : ${d.leads.total} pistes, ${d.leads.sourcesOk}/${d.leads.sourcesTotal} sources en bon état.`,
    `Agents (cumul archivé) : ${d.agents.totals.missions} missions, ${d.agents.totals.drafts} brouillons, ${d.agents.totals.published} publiés, ` + (d.agents.totals.measuredDays ? `${d.agents.totals.apiCalls} appels API, coût estimé ~${d.agents.totals.estimatedUsd} $.` : "coût non mesuré (mesure active à partir de la prochaine exécution)."),
    `Bibliothèque : ${d.library.total} articles, ${d.library.topicsCovered}/12 rubriques.`, "",
    "Détails : artefact privé `mundi-ops-dashboard` du workflow. Interrupteur d'urgence : variable `MUNDI_AUTOPUBLISH=off`."].join("\n") + "\n";
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const stockDir = resolve(process.env.MUNDI_STOCK_DIR || "../mundi-editorial-stock");
  const daysDir = join(stockDir, "editorial/agents/days");
  const days = existsSync(daysDir) ? readdirSync(daysDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map((f) => readJson(join(daysDir, f))).filter(Boolean) : [];
  const d = buildDashboard({ stock: readJson(join(stockDir, "editorial/library/candidates.json")), days,
    publications: readJson("content/publications.json", []), smoke: readJson("reports/production-smoke.json"),
    budgetUsd: Number(process.env.MUNDI_DAILY_BUDGET_USD) || 10 });
  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/ops-dashboard.json", JSON.stringify(d, null, 2) + "\n");
  writeFileSync("reports/ops-dashboard.html", renderHtml(d));
  writeFileSync("reports/ops-alerts.md", renderAlerts(d));
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, renderAlerts(d), { flag: "a" });
  console.log("MUNDI ops: " + d.alerts.length + " alerte(s).");
  for (const a of d.alerts) console.log("ALERTE " + a);
  if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, "alerts=" + d.alerts.length + "\n", { flag: "a" });
}
