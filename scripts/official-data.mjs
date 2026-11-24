#!/usr/bin/env node
/**
 * Accès direct aux données officielles pour les agents de la rédaction (journalistes, professeurs,
 * vérificateurs). Les pages web d'Eurostat, de l'Insee ou de la Commission s'ouvrent mal avec un
 * navigateur automatique ; leurs API publiques, elles, renvoient les chiffres exacts.
 *
 * Chaque commande affiche : l'organisme, le titre de la série, les dernières valeurs avec leur période,
 * la date de mise à jour, et l'adresse à citer comme source (une page lisible par un humain).
 *
 *   node scripts/official-data.mjs eurostat <jeu> [dim=valeur ...] [--last=N]
 *   node scripts/official-data.mjs insee <idbank> [--last=N]
 *   node scripts/official-data.mjs bce <flux> <clé> [--last=N]
 *   node scripts/official-data.mjs banque-mondiale <pays ISO3|ISO2> <indicateur> [--last=N]
 *   node scripts/official-data.mjs fmi <indicateur> <pays ISO3>
 *   node scripts/official-data.mjs chercher <mots> (catalogues data.europa.eu et data.gouv.fr)
 *   node scripts/official-data.mjs texte <url>   (page ou PDF d'un site officiel, converti en texte)
 *
 * Aucun calcul n'est fait : les valeurs sont recopiées telles que l'organisme les publie.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const OFFICIAL_HOSTS = [
  "ec.europa.eu", "data.europa.eu", "commission.europa.eu", "eur-lex.europa.eu",
  "www.insee.fr", "bdm.insee.fr", "www.data.gouv.fr",
  "data-api.ecb.europa.eu", "www.ecb.europa.eu", "api.worldbank.org", "sdmx.oecd.org", "www.imf.org",
];
const UA = "MUNDI-redaction/1.0 (+https://mundiapptest.netlify.app)";

async function get(url, { fetcher = fetch, accept } = {}) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetcher(url, { headers: { "user-agent": UA, ...(accept ? { accept } : {}) }, signal: AbortSignal.timeout(45000) });
      if (r.ok) return r;
      last = new Error("HTTP " + r.status + " pour " + url);
      if (r.status < 500 && r.status !== 429) break;
    } catch (e) { last = e; }
    await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
  }
  throw last;
}
const lastOpt = (args, d = 5) => Number((args.find((a) => a.startsWith("--last=")) ?? "").slice(7)) || d;
const positional = (args) => args.filter((a) => !a.startsWith("--"));

/** JSON-stat 2.0 (Eurostat) → lignes {dims, time, value}. */
export function parseJsonStat(js) {
  const ids = js.id, size = js.size, rows = [];
  const cats = ids.map((id) => {
    const c = js.dimension[id].category, idx = c.index;
    const keys = Array.isArray(idx) ? idx : Object.keys(idx).sort((a, b) => idx[a] - idx[b]);
    return keys.map((k) => ({ code: k, label: c.label?.[k] ?? k }));
  });
  for (const [flat, value] of Object.entries(js.value ?? {})) {
    let rest = Number(flat); const pos = [];
    for (let d = ids.length - 1; d >= 0; d--) { pos[d] = rest % size[d]; rest = Math.floor(rest / size[d]); }
    const dims = {}; let time;
    ids.forEach((id, d) => { const c = cats[d][pos[d]]; if (id === "time") time = c.code; else dims[id] = c.label; });
    rows.push({ dims, time, value, status: js.status?.[flat] });
  }
  return rows.sort((a, b) => JSON.stringify(a.dims).localeCompare(JSON.stringify(b.dims)) || String(a.time).localeCompare(String(b.time)));
}

export async function eurostat(dataset, filters = [], last = 5, opts) {
  // filters : paires [dimension, valeur] ; une dimension peut être répétée (geo=FR geo=DE).
  const q = new URLSearchParams(Array.isArray(filters) ? filters : Object.entries(filters));
  q.set("lastTimePeriod", String(last)); q.set("lang", "fr");
  const api = `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${encodeURIComponent(dataset)}?${q}`;
  const js = await (await get(api, opts)).json();
  return { organisme: "Eurostat", titre: js.label, misAJour: js.updated, lignes: parseJsonStat(js),
    aCiter: `https://ec.europa.eu/eurostat/databrowser/view/${dataset.toLowerCase()}/default/table`, api };
}

/** SDMX 2.1 structure-specific (Insee BDM) → {titre, lignes}. */
export function parseInseeSdmx(xml) {
  const attr = (s, k) => (s.match(new RegExp("\\b" + k + '="([^"]*)"')) ?? [])[1];
  const series = [...xml.matchAll(/<Series\b([^>]*)>([\s\S]*?)<\/Series>/g)].map(([, head, body]) => ({
    idbank: attr(head, "IDBANK"), titre: attr(head, "TITLE_FR"), unite: attr(head, "UNIT_MEASURE"), misAJour: attr(head, "LAST_UPDATE"),
    lignes: [...body.matchAll(/<Obs\b([^>]*)\/>/g)].map(([, o]) => ({ time: attr(o, "TIME_PERIOD"), value: Number(attr(o, "OBS_VALUE")), status: attr(o, "OBS_STATUS") }))
      .sort((a, b) => a.time.localeCompare(b.time)),
  }));
  return series.map((s) => ({ ...s, titre: s.titre?.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&") }));
}
export async function insee(idbank, last = 5, opts) {
  const api = `https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/${encodeURIComponent(idbank)}?lastNObservations=${last}`;
  const [s] = parseInseeSdmx(await (await get(api, opts)).text());
  if (!s) throw new Error("Série Insee introuvable : " + idbank);
  return { organisme: "Insee", titre: s.titre, unite: s.unite, misAJour: s.misAJour, lignes: s.lignes,
    aCiter: `https://www.insee.fr/fr/statistiques/serie/${idbank}`, api };
}

export async function bce(flow, key, last = 5, opts) {
  const api = `https://data-api.ecb.europa.eu/service/data/${encodeURIComponent(flow)}/${encodeURIComponent(key)}?lastNObservations=${last}&format=jsondata`;
  const js = await (await get(api, opts)).json();
  const st = js.structure, series = Object.values(js.dataSets?.[0]?.series ?? {})[0];
  const times = st.dimensions.observation[0].values.map((v) => v.id);
  const titre = st.attributes?.series?.find((a) => a.id === "TITLE")?.values?.[0]?.name ?? st.name;
  return { organisme: "Banque centrale européenne", titre, lignes: Object.entries(series?.observations ?? {}).map(([i, o]) => ({ time: times[i], value: o[0] })),
    aCiter: `https://data.ecb.europa.eu/data/datasets/${flow}/${flow}.${key}`, api };
}

export async function banqueMondiale(country, indicator, last = 5, opts) {
  const api = `https://api.worldbank.org/v2/country/${encodeURIComponent(country)}/indicator/${encodeURIComponent(indicator)}?format=json&mrv=${last}`;
  const [meta, data] = await (await get(api, opts)).json();
  if (!Array.isArray(data)) throw new Error("Indicateur Banque mondiale introuvable : " + JSON.stringify(meta).slice(0, 200));
  return { organisme: "Banque mondiale", titre: data[0]?.indicator?.value + " — " + data[0]?.country?.value, misAJour: meta?.lastupdated,
    lignes: data.map((d) => ({ time: d.date, value: d.value })).filter((d) => d.value !== null).reverse(),
    aCiter: `https://data.worldbank.org/indicator/${indicator}?locations=${country}`, api };
}

export async function fmi(indicator, country, opts) {
  const api = `https://www.imf.org/external/datamapper/api/v1/${encodeURIComponent(indicator)}/${encodeURIComponent(country)}`;
  const js = await (await get(api, opts)).json();
  const vals = js.values?.[indicator]?.[country] ?? {};
  return { organisme: "Fonds monétaire international", titre: `${indicator} — ${country} (les années futures sont des prévisions du FMI)`,
    lignes: Object.entries(vals).map(([time, value]) => ({ time, value })),
    aCiter: `https://www.imf.org/external/datamapper/${indicator}@WEO/${country}`, api };
}

export async function chercher(words, opts) {
  const q = encodeURIComponent(words);
  const out = [];
  try {
    const eu = await (await get(`https://data.europa.eu/api/hub/search/search?q=${q}&limit=8&filter=dataset`, opts)).json();
    for (const r of eu.result?.results ?? []) out.push({ catalogue: "data.europa.eu", titre: r.title?.fr ?? r.title?.en ?? Object.values(r.title ?? {})[0],
      editeur: r.publisher?.name, url: `https://data.europa.eu/data/datasets/${r.id}` });
  } catch (e) { out.push({ catalogue: "data.europa.eu", erreur: String(e.message ?? e) }); }
  try {
    const fr = await (await get(`https://www.data.gouv.fr/api/1/datasets/?q=${q}&page_size=8`, opts)).json();
    for (const r of fr.data ?? []) out.push({ catalogue: "data.gouv.fr", titre: r.title, editeur: r.organization?.name, url: r.page });
  } catch (e) { out.push({ catalogue: "data.gouv.fr", erreur: String(e.message ?? e) }); }
  return out;
}

export function htmlToText(html) {
  return html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
}
export async function texte(url, opts) {
  const host = new URL(url).hostname;
  if (!OFFICIAL_HOSTS.includes(host)) throw new Error("Hôte non prévu pour cet outil : " + host + " (utiliser la recherche web habituelle)");
  const r = await get(url, opts);
  const type = r.headers.get("content-type") ?? "";
  if (/pdf/i.test(type) || /\.pdf($|\?)/i.test(url)) {
    const dir = mkdtempSync(join(tmpdir(), "mundi-pdf-"));
    try {
      const f = join(dir, "doc.pdf"); writeFileSync(f, Buffer.from(await r.arrayBuffer()));
      return { url, type: "pdf", texte: execFileSync("pdftotext", ["-layout", f, "-"], { maxBuffer: 64 << 20 }).toString() };
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
  return { url, type: "html", texte: htmlToText(await r.text()) };
}

export function formatResult(r) {
  const lines = [`${r.organisme} — ${r.titre}`];
  if (r.unite) lines.push("Unité : " + r.unite);
  if (r.misAJour) lines.push("Mise à jour : " + r.misAJour);
  // Les dimensions identiques sur toutes les lignes (unité, correction, âge…) sont écrites une seule fois.
  const keys = Object.keys(r.lignes[0]?.dims ?? {});
  const fixed = keys.filter((k) => new Set(r.lignes.map((l) => l.dims[k])).size === 1);
  if (fixed.length) lines.push("Champ : " + fixed.map((k) => `${k} = ${r.lignes[0].dims[k]}`).join(" ; "));
  for (const l of r.lignes) {
    const vary = keys.filter((k) => !fixed.includes(k)).map((k) => l.dims[k]);
    lines.push(`  ${vary.length ? vary.join(" | ") + " | " : ""}${l.time} : ${l.value}${l.status ? " (" + l.status + ")" : ""}`);
  }
  if (!r.lignes.length) lines.push("  (aucune valeur : vérifier les filtres)");
  lines.push("À citer comme source : " + r.aCiter, "Données brutes : " + r.api);
  return lines.join("\n");
}

async function main(argv) {
  const [cmd, ...args] = argv;
  const pos = positional(args), last = lastOpt(args);
  let r;
  if (cmd === "eurostat") r = await eurostat(pos[0], pos.slice(1).map((a) => a.split("=")), last);
  else if (cmd === "insee") r = await insee(pos[0], last);
  else if (cmd === "bce") r = await bce(pos[0], pos[1], last);
  else if (cmd === "banque-mondiale") r = await banqueMondiale(pos[0], pos[1], last);
  else if (cmd === "fmi") { r = await fmi(pos[0], pos[1]); const y = new Date().getUTCFullYear(); r.lignes = r.lignes.filter((l) => +l.time >= y - last && +l.time <= y + 2); }
  else if (cmd === "chercher") { for (const x of await chercher(pos.join(" "))) console.log(x.erreur ? `[${x.catalogue}] indisponible : ${x.erreur}` : `[${x.catalogue}] ${x.titre} — ${x.editeur ?? "?"}\n  ${x.url}`); return; }
  else if (cmd === "texte") { const t = await texte(pos[0]); console.log(t.texte.slice(0, Number((args.find((a) => a.startsWith("--max=")) ?? "").slice(6)) || 60000)); return; }
  else { console.log("Usage : voir l'en-tête de scripts/official-data.mjs"); process.exitCode = 2; return; }
  console.log(formatResult(r));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  // Le fetch intégré de Node ignore HTTPS_PROXY sauf avec NODE_USE_ENV_PROXY=1 (sessions cloud derrière un proxy).
  if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
    const r = spawnSync(process.execPath, ["--no-warnings", ...process.argv.slice(1)], { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });
    process.exit(r.status ?? 1);
  }
  main(process.argv.slice(2)).catch((e) => { console.error("Échec : " + (e?.message ?? e)); process.exitCode = 1; });
}
