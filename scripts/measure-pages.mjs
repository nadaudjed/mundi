#!/usr/bin/env node
/**
 * Poids des pages du site construit (out/) : HTML + JavaScript + CSS chargés au premier affichage.
 * Mesure reproductible, pour comparer avant et après une optimisation (ticket #120).
 *   node scripts/measure-pages.mjs [/explorer/ /reviser/ ...] [--json]
 */
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const OUT = process.env.OUT_DIR ?? "out";
const args = process.argv.slice(2);
const json = args.includes("--json");
const pages = args.filter((a) => a.startsWith("/"));
const list = pages.length ? pages : ["/", "/explorer/", "/reviser/", "/enregistres/", "/dossiers/cobalt-congolais/"];

const size = (buf) => ({ raw: buf.length, gzip: gzipSync(buf, { level: 9 }).length });
const kb = (n) => (n / 1024).toFixed(1);

const rows = list.map((path) => {
  const file = join(OUT, path, "index.html");
  if (!existsSync(file)) return { path, missing: true };
  const html = readFileSync(file);
  const text = html.toString("utf8");
  const assets = [...new Set([...text.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]))];
  const parts = { html: size(html), js: { raw: 0, gzip: 0 }, css: { raw: 0, gzip: 0 } };
  for (const a of assets) {
    const s = size(readFileSync(join(OUT, a)));
    const k = a.endsWith(".css") ? "css" : "js";
    parts[k].raw += s.raw;
    parts[k].gzip += s.gzip;
  }
  const total = { raw: parts.html.raw + parts.js.raw + parts.css.raw, gzip: parts.html.gzip + parts.js.gzip + parts.css.gzip };
  return { path, ...parts, total, files: assets.length };
});

if (json) console.log(JSON.stringify(rows, null, 2));
else {
  console.log("| Page | HTML | JS | CSS | Total | Total gzip |");
  console.log("| --- | ---: | ---: | ---: | ---: | ---: |");
  for (const r of rows) {
    if (r.missing) { console.log(`| ${r.path} | absente | | | | |`); continue; }
    console.log(`| ${r.path} | ${kb(r.html.raw)} Ko | ${kb(r.js.raw)} Ko | ${kb(r.css.raw)} Ko | ${kb(r.total.raw)} Ko | ${kb(r.total.gzip)} Ko |`);
  }
}
