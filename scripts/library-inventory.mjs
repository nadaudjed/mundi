#!/usr/bin/env node
/**
 * PRIVATE newsroom inventory: published articles, human-approved reserve,
 * UNVERIFIED ideas and archived candidate metadata. No publishing action.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";

export const LAUNCH_TARGETS = Object.freeze({
  verifiedTotal:120, approvedReserve:30, coverTopics:12, distinctPublisherDomains:5,
  activeIndependentProviders:5, reserveDays:30, publicationsPerWeek:7
});
export const PUBLISHING_PER_DAY = 1;
export const TOPICS = [
  "geopolitique","economie","finance","industrie","materiaux-critiques","energie",
  "recyclage","environnement","technologie","entreprises","afrique","sciences-societe"
];
function safeDate(v) {return typeof v==="string"&&Number.isFinite(Date.parse(v))?Date.parse(v):null;}
function safeHost(value) {
  try {const u=new URL(value); return u.protocol==="https:"?u.hostname:null;}catch{return null;}
}
function clean(v,max=220) {return String(v??"").slice(0,max);}
function escapeHtml(v){return clean(v,3000).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function validApproval(item){
  return item&&typeof item==="object"&&item.status==="approved"&&
    typeof item.slug==="string"&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)&&
    TOPICS.includes(item.topic)&&typeof item.approvedBy==="string"&&item.approvedBy.trim().length>=3&&
    safeDate(item.approvedAt)!==null&&typeof item.internalDraftPath==="string"&&
    item.internalDraftPath.startsWith("editorial/reviews/")&&
    Array.isArray(item.sources)&&item.sources.length>=2&&item.sources.every(s=>safeHost(s?.url));
}
export function measureLibrary({published:all,ideas,reserve,sources,stock=null,now="2026-11-23T12:00:00Z"}){
  if(!Array.isArray(all))throw new Error("Publications must be an array");
  // Un article retiré (doublon fusionné, #125) reste dans le fichier pour la traçabilité mais ne compte pas.
  const published=all.filter(p=>p?.status!=="withdrawn");
  if(!ideas||ideas.format!=="mundi-editorial-ideas-v1"||!Array.isArray(ideas.items))throw new Error("Invalid idea library");
  if(!reserve||reserve.format!=="mundi-approved-reserve-v1"||!Array.isArray(reserve.items))throw new Error("Invalid approved reserve");
  if(!Array.isArray(sources))throw new Error("Invalid sources registry");
  if(stock!==null&&(stock.format!=="mundi-candidate-stock-v1"||!Array.isArray(stock.items)))throw new Error("Invalid private candidate archive");
  const timestamp=safeDate(now);if(timestamp===null)throw new Error("Invalid clock");
  const pubIds=new Set(),reservedIds=new Set();
  for(const p of published){
    if(p?.status!=="published"||!p?.slug||pubIds.has(p.slug))throw new Error("Invalid or duplicate published entry");
    pubIds.add(p.slug);
  }
  for(const r of reserve.items){
    if(!validApproval(r)||reservedIds.has(r.slug)||pubIds.has(r.slug))throw new Error("Reserve entry lacks human approval or duplicates a published item");
    reservedIds.add(r.slug);
  }
  if(ideas.items.some(i=>i?.status!=="idea_unverified"||i.approved!==false||i.factChecked!==false||!TOPICS.includes(i.topic)||i.sources?.length))
    throw new Error("Ideas must remain explicitly unsourced and unverified");
  const perTopic=TOPICS.map(topic=>({
    topic,published:published.filter(p=>p.topic===topic).length,
    ready:reserve.items.filter(p=>p.topic===topic).length,
    ideas:ideas.items.filter(p=>p.topic===topic).length,
    candidates:stock?.items.filter(p=>p.topicHint===topic).length??null
  }));
  const approvedReady=reserve.items.length;
  const verifiedTotal=published.length+approvedReady;
  const distinctPublisherDomains=new Set([...published,...reserve.items].flatMap(p=>
    (p.sources||[]).map(s=>safeHost(s.url)).filter(Boolean))).size;
  const providers=new Set(sources.filter(s=>s.enabled===true&&s.rightsStatus==="approved_metadata_collection"&&safeHost(s.rightsUrl))
    .map(s=>String(s.publisher||"").split(" — ")[0].trim()).filter(Boolean));
  const covered=perTopic.filter(t=>t.published+t.ready>0).length;
  const recentPublished=published.filter(p=>{const at=safeDate(p.publishedAt);return at!==null&&at<=timestamp&&timestamp-at<=7*86400000;}).length;
  const reserveDays=approvedReady/PUBLISHING_PER_DAY;
  const current={
    published:published.length,approvedReserve:approvedReady,verifiedTotal,
    unverifiedIdeas:ideas.items.length,
    unverifiedCandidates:stock===null?null:stock.items.length,
    candidateArchiveAvailable:stock!==null,
    coveredTopics:covered,
    sourcePublishers:distinctPublisherDomains,
    authorizedIndependentProviders:providers.size,
    publishedLast7Days:recentPublished,
    reserveDays,
  };
  const checks={
    verifiedLibrary:verifiedTotal>=LAUNCH_TARGETS.verifiedTotal,
    approvedReserve:approvedReady>=LAUNCH_TARGETS.approvedReserve,
    subjectCoverage:covered>=LAUNCH_TARGETS.coverTopics,
    publishingSources:distinctPublisherDomains>=LAUNCH_TARGETS.distinctPublisherDomains,
    authorizedFeedDiversity:providers.size>=LAUNCH_TARGETS.activeIndependentProviders,
    reserveRunway:reserveDays>=LAUNCH_TARGETS.reserveDays,
    productionCadence:recentPublished>=LAUNCH_TARGETS.publicationsPerWeek
  };
  return {
    format:"mundi-library-inventory-v1",generatedAt:new Date(timestamp).toISOString(),
    notice:"Les 120 idées et les pistes RSS ne comptent PAS comme articles vérifiés. Aucun contenu n'est publié par cet inventaire.",
    launchReady:Object.values(checks).every(Boolean),
    targets:{...LAUNCH_TARGETS,publicationsPerDay:PUBLISHING_PER_DAY},
    current,checks,perTopic,
    sourceHealth:stock?.latestCollection?.sourceHealth??[],
    latestCandidates:stock?.items.slice(0,20).map(x=>({
      title:clean(x.title),link:x.link,publisher:clean(x.publisher,120),
      topicHint:clean(x.topicHint,100),lastSeenAt:x.lastSeenAt,
      status:"candidate_unverified"
    }))??[]
  };
}
export function inventoryHtml(i){
  const metric=(label,n,extra="")=>'<div class="metric"><strong>'+escapeHtml(n)+
    '</strong><span>'+escapeHtml(label)+'</span><small>'+escapeHtml(extra)+'</small></div>';
  const state=Object.entries(i.checks).map(([k,passed])=>'<li class="'+(passed?"pass":"fail")+'">'+
    (passed?"✓":"À renforcer")+' · '+escapeHtml(k)+'</li>').join("");
  const rows=i.perTopic.map(r=>'<tr><th>'+escapeHtml(r.topic)+'</th><td>'+r.published+
    '</td><td>'+r.ready+'</td><td>'+r.ideas+'</td><td>'+(r.candidates===null?"archive indisponible":r.candidates)+'</td></tr>').join("");
  const candidates=i.latestCandidates.map(c=>'<li><a target="_blank" rel="noopener noreferrer" href="'+
    escapeHtml(c.link)+'">'+escapeHtml(c.title)+'</a> · '+escapeHtml(c.publisher)+
    ' <small>NON VÉRIFIÉ</small></li>').join("");
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<meta name="robots" content="noindex,nofollow"><title>MUNDI · réserve éditoriale privée</title><style>'+
    'body{font:16px/1.45 system-ui,sans-serif;max-width:1050px;margin:auto;padding:25px;color:#101d30;background:#f3f0e8}h1{font-size:clamp(2rem,6vw,4.5rem);letter-spacing:-.06em}h2{margin-top:40px}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px}.metric{border-top:3px solid #20b99a;padding:14px 0}.metric strong{display:block;font-size:2.5rem}.metric span,.metric small{display:block}.metric small{color:#52606d}.warning{padding:15px;border-left:4px solid #bd602a;background:#fff6e5}.pass{color:#097357}.fail{color:#963e20}table{width:100%;border-collapse:collapse;overflow:auto}td,th{text-align:left;padding:9px;border-bottom:1px solid #c9d0d0}a{color:#174d86}li{margin:7px 0}small{color:#65717d}' +
    '</style></head><body><p>MUNDI / OUTIL DE RÉDACTION PRIVÉ</p><h1>Notre bibliothèque éditoriale</h1>'+
    '<p class="warning"><strong>'+(i.launchReady?"Seuils de lancement atteints.":"Lancement grand public pas encore prêt.")+
    '</strong> Les idées et les pistes collectées ne sont ni des articles, ni des faits validés.</p>'+
    '<div class="metrics">'+metric("Articles publiés",i.current.published)+
    metric("Réserve approuvée",i.current.approvedReserve,"Cible : "+i.targets.approvedReserve)+
    metric("Idées non vérifiées",i.current.unverifiedIdeas)+
    metric("Candidats RSS non vérifiés",i.current.unverifiedCandidates??"non disponible")+
    metric("Jours de réserve",i.current.reserveDays,"Au rythme cible de "+i.targets.publicationsPerDay+"/jour")+
    metric("Rubriques réellement couvertes",i.current.coveredTopics,"Sur "+i.targets.coverTopics)+
    '</div><h2>Conditions du lancement</h2><ul>'+state+'</ul>'+
    '<h2>Couverture par rubrique</h2><div style="overflow-x:auto"><table><thead><tr><th>Rubrique</th><th>Publiés</th><th>Prêts</th><th>Idées</th><th>Pistes</th></tr></thead><tbody>'+
    rows+'</tbody></table></div><h2>Dernières pistes de veille</h2><p>Liens externes à consulter, aucune rédaction ni vérification incluse.</p>'+
    '<ol>'+candidates+'</ol><p>Rapport généré le '+escapeHtml(i.generatedAt)+
    ' · Aucune fonction de publication ni connexion à MUNDI public.</p></body></html>';
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const read=path=>JSON.parse(readFileSync(resolve(path),"utf8"));
  const stockPath=resolve(process.env.MUNDI_STOCK_PATH||"reports/editorial-stock.json");
  const input={
    published:read("content/publications.json"),
    ideas:read("editorial/library/evergreen-ideas.json"),
    reserve:read("editorial/library/approved-reserve.json"),
    sources:read("content/sources.json"),
    stock:existsSync(stockPath)?JSON.parse(readFileSync(stockPath,"utf8")):null,
    now:new Date().toISOString()
  };
  const inv=measureLibrary(input);
  const dir=resolve(process.env.MUNDI_REPORT_DIR||"reports");
  mkdirSync(dir,{recursive:true});
  writeFileSync(resolve(dir,"library-inventory.json"),JSON.stringify(inv,null,2)+"\n");
  writeFileSync(resolve(dir,"library-inventory.html"),inventoryHtml(inv));
  console.log("MUNDI newsroom inventory: verified",inv.current.verifiedTotal,
    "approved reserve",inv.current.approvedReserve,"ideas",inv.current.unverifiedIdeas,
    "unverified candidates",inv.current.unverifiedCandidates,
    "launch ready:",inv.launchReady);
  console.log("This is a diagnostic: NOT a content publishing workflow.");
}
