#!/usr/bin/env node
/**
 * Après le build, écrit out/_redirects (ticket #129).
 *
 * - Sur Cloudflare Workers (adresse officielle) et partout ailleurs : les redirections internes de
 *   netlify.toml (une seule liste à tenir : articles fusionnés, anciens récits).
 * - Sur la production Netlify seulement (NETLIFY et CONTEXT=production) : l'ancienne adresse renvoie
 *   chaque page vers la même page de l'adresse officielle, paramètres de recherche compris. La page
 *   /transfert/ et les fichiers qu'elle utilise restent servis par Netlify : c'est là que les lecteurs
 *   récupèrent leurs favoris, dossiers suivis et préférences, gardés par le navigateur pour cette adresse.
 *   Redirection temporaire (302) pendant la transition ; MUNDI_LEGACY_REDIRECT_STATUS=301 la rend
 *   permanente une fois les lecteurs prévenus (un navigateur garde une 301 en mémoire).
 * Netlify lit _redirects avant netlify.toml : ces règles passent donc en premier.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

export const OFFICIAL_SITE_URL = "https://mundi.nadaudjacques004.workers.dev";

/** Redirections [[redirects]] de netlify.toml : { from, to, status }. */
export function netlifyRedirects(toml) {
  return String(toml).split(/^\[\[redirects\]\]\s*$/m).slice(1).map((block) => {
    const get = (k) => block.match(new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\n]+)"?\\s*$`, "m"))?.[1]?.trim();
    return { from: get("from"), to: get("to"), status: Number(get("status") ?? 301) };
  }).filter((r) => r.from && r.to);
}

/** Format _redirects (Cloudflare et Netlify) : « source destination code ». */
export function redirectsFile(rules, header = "# Généré par scripts/cloudflare-files.mjs depuis netlify.toml : ne pas modifier à la main.") {
  return [header, ...rules.map((r) => `${r.from} ${r.to} ${r.status}`)].join("\n") + "\n";
}

/** Page d'aiguillage de l'ancien accueil, écrite dans out/ sur Netlify seulement. */
export const LEGACY_HOME = "/ancienne-adresse/index.html";

/**
 * Accueil de l'ancienne adresse. Une redirection du serveur ne laisserait jamais l'application installée
 * (iPhone surtout, dont le stockage est séparé de Safari) atteindre la page de transfert. Cette page :
 * s'il reste des données MUNDI pas encore emportées, ouvre /transfert/ ; sinon, va à l'adresse officielle.
 */
export function legacyHome(site = OFFICIAL_SITE_URL) {
  const target = String(site).replace(/\/+$/, "");
  const keys = ["mundi:bookmarks", "mundi:follows:v1", "mundi:topics:v1", "mundi:revision:v1"];
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MUNDI a changé d'adresse</title><meta name="robots" content="noindex">
<link rel="canonical" href="${target}/"><meta property="og:url" content="${target}/">
<meta property="og:title" content="MUNDI — Comprendre le monde"><meta property="og:image" content="${target}/og/mundi.png">
<noscript><meta http-equiv="refresh" content="0;url=${target}/"></noscript>
<style>body{font:17px/1.5 system-ui,sans-serif;max-width:34rem;margin:15vh auto;padding:0 1.25rem;color:#101D30}a{color:inherit;font-weight:600}</style>
<script>(function(){var t=${JSON.stringify(target)},k=${JSON.stringify(keys)},d=false;try{if(!localStorage.getItem("mundi:transfert"))for(var i=0;i<k.length;i++){var v=localStorage.getItem(k[i]);if(v&&v!=="[]"&&v!=="{}")d=true}}catch(e){}location.replace(d?"/transfert/":t+"/"+location.search)})()</script>
</head><body><h1>MUNDI a changé d'adresse</h1><p>La nouvelle adresse est <a href="${target}/">${target.replace("https://", "")}</a>.</p>
<p>Vous aviez des favoris ou des dossiers suivis ici ? <a href="/transfert/">Emportez-les</a>.</p></body></html>
`;
}

/** Chemins encore servis par l'ancienne adresse : la page de transfert et ses fichiers. */
export const LEGACY_KEEP = ["/transfert/*", "/_next/*", "/icons/*", "/og/*", "/sw.js", "/manifest.webmanifest", "/icon.svg", "/favicon.ico"];

/**
 * Règles de l'ancienne adresse Netlify vers l'adresse officielle.
 * Les articles fusionnés et les anciens récits vont directement à leur page finale (un seul saut) ;
 * tout le reste garde son chemin. Une règle « 200 » sans « ! » laisse Netlify servir le fichier existant.
 */
export function legacyRules(internal, { site = OFFICIAL_SITE_URL, status = 302 } = {}) {
  const target = String(site).replace(/\/+$/, "");
  if (!/^https:\/\//.test(target)) throw new Error("Adresse officielle invalide : " + site);
  // Rediriger Netlify vers Netlify ferait une boucle.
  if (/\.netlify\.app$/.test(new URL(target).hostname)) throw new Error("L'adresse officielle ne peut pas être sur netlify.app : " + site);
  if (![301, 302].includes(status)) throw new Error("Code de redirection attendu : 301 ou 302");
  const keep = LEGACY_KEEP.map((p) => ({ from: p, to: p.endsWith("/*") ? p.slice(0, -1) + ":splat" : p, status: 200 }));
  return [
    // L'accueil (adresse de départ de l'application installée) passe par une page d'aiguillage.
    { from: "/", to: LEGACY_HOME, status: "200!" },
    { from: "/transfert", to: "/transfert/", status: 301 },
    ...keep,
    ...internal.filter((r) => r.to.startsWith("/")).map((r) => ({ from: r.from, to: target + r.to, status: `${status}!` })),
    { from: "/*", to: `${target}/:splat`, status: `${status}!` },
  ];
}

/**
 * out/version.json : quelle version est servie (contrôle de production, retour arrière).
 * build : MUNDI_BUILD_ID (workflow de déploiement), sinon l'identifiant de Workers Builds, de GitHub ou local.
 */
export function versionInfo(env = process.env, now = new Date()) {
  let commit = env.WORKERS_CI_COMMIT_SHA || env.GITHUB_SHA || env.COMMIT_REF || "";
  if (!commit) { try { commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch { commit = "inconnu"; } }
  const build = env.MUNDI_BUILD_ID || env.WORKERS_CI_BUILD_UUID || (env.GITHUB_RUN_ID ? `gh-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT || 1}` : `local-${now.getTime()}`);
  const editionDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return { build, commit, branch: env.WORKERS_CI_BRANCH || env.GITHUB_REF_NAME || env.BRANCH || "", builtAt: now.toISOString(), editionDay };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!existsSync("out")) { console.error("Dossier out/ absent : lancer le build d'abord."); process.exit(1); }
  const version = versionInfo();
  writeFileSync("out/version.json", JSON.stringify(version) + "\n");
  console.log("out/version.json : " + JSON.stringify(version));
  const internal = netlifyRedirects(readFileSync("netlify.toml", "utf8"));
  const legacy = Boolean(process.env.NETLIFY) && process.env.CONTEXT === "production";
  if (legacy) {
    const status = Number(process.env.MUNDI_LEGACY_REDIRECT_STATUS || 302);
    const configured = /\.netlify\.app/.test(process.env.MUNDI_SITE_URL || "") ? "" : process.env.MUNDI_SITE_URL;
    const site = configured || OFFICIAL_SITE_URL;
    const rules = legacyRules(internal, { site, status });
    mkdirSync("out/ancienne-adresse", { recursive: true });
    writeFileSync("out" + LEGACY_HOME, legacyHome(site));
    writeFileSync("out/_redirects", redirectsFile(rules, "# Ancienne adresse Netlify → adresse officielle Cloudflare (#129). Généré par scripts/cloudflare-files.mjs."));
    console.log(`out/_redirects (Netlify, ancienne adresse) : ${rules.length} règle(s), redirection ${status}.`);
  } else {
    writeFileSync("out/_redirects", redirectsFile(internal));
    console.log(`out/_redirects : ${internal.length} redirection(s).`);
  }
}
