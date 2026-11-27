#!/usr/bin/env node
/**
 * Hébergement gratuit sur Cloudflare Pages : après le build, écrit out/_redirects à partir des
 * redirections de netlify.toml (une seule liste à tenir). Netlify lit aussi ce fichier : sans effet là-bas.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Redirections [[redirects]] de netlify.toml : { from, to, status }. */
export function netlifyRedirects(toml) {
  return String(toml).split(/^\[\[redirects\]\]\s*$/m).slice(1).map((block) => {
    const get = (k) => block.match(new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\n]+)"?\\s*$`, "m"))?.[1]?.trim();
    return { from: get("from"), to: get("to"), status: Number(get("status") ?? 301) };
  }).filter((r) => r.from && r.to);
}

/** Format _redirects de Cloudflare Pages (et Netlify) : « source destination code ». */
export function redirectsFile(rules) {
  return ["# Généré par scripts/cloudflare-files.mjs depuis netlify.toml : ne pas modifier à la main.",
    ...rules.map((r) => `${r.from} ${r.to} ${r.status}`)].join("\n") + "\n";
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!existsSync("out")) { console.error("Dossier out/ absent : lancer le build d'abord."); process.exit(1); }
  const rules = netlifyRedirects(readFileSync("netlify.toml", "utf8"));
  writeFileSync("out/_redirects", redirectsFile(rules));
  console.log(`out/_redirects : ${rules.length} redirection(s).`);
}
