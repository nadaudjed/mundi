#!/usr/bin/env node
/** Transforme une collecte locale RSS en tableau de lecture privé, sans publication. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;",
  })[c]);
}
export function makeReport(data) {
  if (!data || !Array.isArray(data.items) || !Array.isArray(data.errors)) throw new Error("Collecte invalide");
  const items = data.items.map(item => {
    let href = "";
    try {
      const u = new URL(item.link);
      if (u.protocol === "https:") href = u.href;
    } catch { /* URL invalide : pas de lien */ }
    const hrefHtml = href ? '<a href="'+escapeHtml(href)+'" target="_blank" rel="noopener noreferrer">Ouvrir la source</a>' : '<span>URL invalide</span>';
    let rights = "";
    try {
      const u = new URL(item.rightsUrl);
      if (u.protocol === "https:") rights = u.href;
    } catch { /* rights URL absent or invalid */ }
    const rightsHtml = rights ? ' · <a href="'+escapeHtml(rights)+'" target="_blank" rel="noopener noreferrer">Conditions de réutilisation</a>' : "";
    return '<li class="candidate" data-topic="'+escapeHtml(item.topicHint)+'"><article>'+
      '<p class="meta">'+escapeHtml(item.publisher)+' · '+escapeHtml(item.topicHint)+' · '+escapeHtml(item.publishedAt || "Date inconnue")+'</p>'+
      '<h2>'+escapeHtml(item.title)+'</h2>'+
      '<p>'+hrefHtml+rightsHtml+'</p><p class="warning">À vérifier · non publié</p>'+
      '<details><summary>Liste de vérification</summary><ul><li>Lire l’article d’origine</li><li>Vérifier les faits et les dates</li><li>Croiser si nécessaire avec une autre source</li><li>Rédiger un contenu original</li><li>Faire valider par une personne avant publication</li></ul></details>'+
      '</article></li>';
  }).join("\n");
  const errors = data.errors.map(e=>'<li><strong>'+escapeHtml(e.sourceId)+'</strong> : '+escapeHtml(e.error)+'</li>').join("\n");
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+
    '<meta name="robots" content="noindex,nofollow"><title>MUNDI · Veille de rédaction</title>'+
    '<style>body{font-family:system-ui,sans-serif;background:#f3f0e8;color:#101d30;margin:0}main{max-width:980px;margin:auto;padding:28px 20px 80px}h1{font-size:clamp(2rem,5vw,3rem)}h2{font-size:1.16rem}.subtitle{max-width:680px;color:#455060;line-height:1.65}.stats{font-weight:bold}ol.candidates{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,310px),1fr));gap:16px}.candidate{background:white;border-radius:16px;padding:20px;border:1px solid #dde1e5}.meta{font-size:.78rem;color:#586474}.warning{font-size:.78rem;color:#975d00}a{color:#246bce;font-weight:650}details{font-size:.85rem;margin-top:16px}details li{margin-top:8px}#filter{font:inherit;padding:10px;border-radius:10px;background:white;border:1px solid #bbb}footer{font-size:.83rem;color:#586474;margin-top:48px}</style></head><body><main>'+
    '<p>MUNDI / RECHERCHE INTERNE</p><h1>Veille éditoriale</h1>'+
    '<p class="subtitle">Titres collectés depuis des flux RSS, uniquement pour la recherche. Les sujets ci-dessous ne sont ni des articles MUNDI ni des actualités vérifiées.</p>'+
    '<p class="stats">'+escapeHtml(data.items.length)+' sujets candidats · '+escapeHtml(data.errors.length)+' erreurs de source</p>'+
    '<p>Collecte : '+escapeHtml(data.generatedAt)+'</p>'+
    '<label for="filter">Filtrer par rubrique </label><select id="filter"><option value="">Toutes les rubriques</option>'+
    [...new Set(data.items.map(x=>x.topicHint))].sort().map(t=>'<option value="'+escapeHtml(t)+'">'+escapeHtml(t)+'</option>').join("")+
    '</select><ol class="candidates">'+(items || '<li>Aucun sujet disponible.</li>')+'</ol>'+
    '<h2>Flux indisponibles</h2><ul>'+(errors || '<li>Aucune erreur signalée.</li>')+'</ul>'+
    '<footer>Fichier local de consultation. Ne pas publier sur Internet, ni utiliser les titres comme preuve d’un événement.</footer></main>'+
    '<script>document.getElementById("filter").addEventListener("change",function(){for(const card of document.querySelectorAll(".candidate"))card.hidden=Boolean(this.value)&&card.dataset.topic!==this.value;});</script>'+
    '</body></html>';
}

if(process.argv[1] && import.meta.url === new URL("file://"+resolve(process.argv[1])).href) {
  const input = resolve(process.env.MUNDI_INBOX_PATH || "reports/editorial-inbox.json");
  const output = resolve(process.env.MUNDI_REPORT_PATH || "reports/editorial-inbox.html");
  const data = JSON.parse(readFileSync(input,"utf8"));
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,makeReport(data));
  console.log("Rapport privé créé : "+output);
}
