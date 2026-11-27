#!/usr/bin/env node
/**
 * MUNDI production smoke check, no API keys and no publishing.
 * Inspecte l'adresse officielle (Cloudflare Workers, #129), pas un aperçu : pages, nouveautés, date de
 * l'édition, version déployée, liens de partage, redirections, notifications, et l'ancienne adresse Netlify.
 */
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";

// Adresse officielle : variable MUNDI_SITE_URL (dépôt : Settings > Variables), sinon Cloudflare Workers.
export const OFFICIAL="https://mundi.nadaudjacques004.workers.dev";
export const LEGACY="https://mundiapptest.netlify.app";
// Une ancienne valeur netlify.app est ignorée : l'adresse officielle est désormais Cloudflare (#129).
const configured=/\.netlify\.app/.test(process.env.MUNDI_SITE_URL||"")?"":process.env.MUNDI_SITE_URL;
if(configured===""&&process.env.MUNDI_SITE_URL)console.log("::warning::Variable MUNDI_SITE_URL = ancienne adresse Netlify, ignorée : la remplacer par "+OFFICIAL+" (Settings > Secrets and variables > Actions > Variables).");
const SITE=(configured||OFFICIAL).replace(/\/+$/,"");
const HOST=new URL(SITE).hostname;
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
export function checkTargets(publications){
  if(!Array.isArray(publications))throw new Error("Published catalog must be an array");
  const news=publications.filter(p=>p?.status==="published");
  if(news.length===0)throw new Error("No real publications in the local build");
  if(news.some(p=>typeof p?.slug!=="string"||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)))
    throw new Error("Unsafe published slug");
  return [
    // Repères stables : titre principal de l'accueil et titre de la page Publications.
    // Ne pas choisir un message d'interface qui change à chaque refonte (fausse alerte #103).
    {path:"/",needle:"MUNDI — fil des publications sourcées",label:"Accueil"},
    {path:"/actualites/",needle:"Publications documentées",label:"Page Publications"},
    {path:"/explorer/",needle:"Explorer les sujets et les publications",label:"Recherche publique"},
    {path:"/reviser/",needle:"Réviser les actualités et les cours",label:"Révision des publications"},
    ...news.slice(0,5).map(p=>({
      path:"/actualites/"+encodeURIComponent(p.slug)+"/",
      needle:p.title.slice(0,12),label:p.slug
    }))
  ];
}
export async function probe(site,targets,fetcher=fetch){
  if(site!==SITE)throw new Error("Unexpected host in production smoke check");
  const results=[];
  for(const t of targets){
    let status=0,error="",ok=false;
    try{
      const response=await fetcher(site+t.path,{
        method:"GET",redirect:"follow",signal:AbortSignal.timeout(15000),
        headers:{Accept:"text/html","User-Agent":"MUNDI-Production-Smoke/1.0"}
      });
      status=response.status;
      const effective=new URL(response.url??site+t.path);
      if(!response.ok)error="HTTP "+status;
      else if(effective.hostname!==HOST)error="Unexpected redirect";
      else{
        const html=await response.text();
        if(html.length<250)error="HTML response too small";
        else if(!html.includes(t.needle))error="Expected public content missing: "+t.label;
        else ok=true;
      }
    }catch(e){error=String(e?.message||e).slice(0,150)}
    results.push({path:t.path,ok,status,error});
  }
  return {site,ok:results.every(x=>x.ok),results};
}
/** Date du jour à Paris (AAAA-MM-JJ), comme lib/today.ts. */
export const parisDay=now=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
/**
 * Date de l'édition servie (#125) : l'accueil porte data-edition-today, la date de Paris de son build.
 * Si elle est antérieure au jour, le site servi n'a pas été reconstruit depuis minuit.
 */
export function editionCheck(html,now=new Date()){
  const served=String(html??"").match(/data-edition-today="(\d{4}-\d{2}-\d{2})"/)?.[1]??null;
  const expected=parisDay(now);
  if(!served)return {ok:false,served,expected,error:"Accueil sans date d'édition (data-edition-today) : vérifier que le dernier déploiement contient le correctif #125."};
  if(served<expected)return {ok:false,served,expected,error:`Le site servi date du ${served} alors qu'on est le ${expected} à Paris : relancer le workflow « édition du jour après minuit » ou un déploiement Cloudflare (Workers & Pages > mundi > Deployments).`};
  return {ok:true,served,expected};
}
/**
 * Échantillon des nouveautés (#125) : pour les publications les plus récentes, la page, la photo et
 * l'écoute MP3 si elles existent. Chaque erreur nomme l'article et l'action à mener.
 */
export function assetTargets(publications,images=[],audio=[],n=5){
  const live=publications.filter(p=>p?.status==="published").sort((a,b)=>String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0,n);
  const photo=new Map(images.filter(x=>!x.card).map(x=>[x.slug,x.src]));
  const sound=new Map((Array.isArray(audio)?audio:Object.entries(audio)).map(([slug,x])=>[slug,x?.src]));
  const out=[];
  for(const p of live){
    if(photo.get(p.slug))out.push({path:photo.get(p.slug),type:"image/",slug:p.slug,action:"photo absente du déploiement : relancer la collecte des photos ou retirer l'entrée de content/editorial-images.json"});
    if(sound.get(p.slug))out.push({path:sound.get(p.slug),type:"audio/",slug:p.slug,action:"MP3 absent du déploiement : relancer le workflow audio (article-audio.yml)"});
  }
  return out;
}
export async function probeAssets(site,targets,fetcher=fetch){
  if(site!==SITE)throw new Error("Unexpected host in production smoke check");
  const results=[];
  for(const t of targets){
    let ok=false,status=0,error="";
    try{
      const r=await fetcher(site+t.path,{method:"GET",redirect:"follow",signal:AbortSignal.timeout(15000),headers:{"User-Agent":"MUNDI-Production-Smoke/1.0"}});
      status=r.status;
      const type=String(r.headers?.get?.("content-type")??"");
      if(!r.ok)error="HTTP "+status;
      else if(!type.startsWith(t.type))error="type inattendu ("+(type||"aucun")+")";
      else ok=true;
    }catch(e){error=String(e?.message||e).slice(0,150)}
    results.push({path:t.path,slug:t.slug,ok,status,...(ok?{}:{error:error+" — "+t.slug+" : "+t.action})});
  }
  return results;
}
/**
 * Contrôles propres au changement d'adresse (#129), sur le HTML et les réponses du site officiel.
 * fetcher(url,{redirect}) → Response. Chaque contrôle renvoie {label,ok,detail}.
 */
const meta=(html,prop)=>String(html).match(new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]*)"`))?.[1]??null;
const canonical=html=>String(html).match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/)?.[1]??null;
export function shareCheck(label,html,site,path){
  const url=meta(html,"og:url"),img=meta(html,"og:image"),can=canonical(html);
  const bad=[];
  if(url!==site+path)bad.push("og:url "+(url??"absent"));
  if(can!==null&&can!==site+path)bad.push("canonical "+can);
  if(!img||!img.startsWith(site+"/"))bad.push("og:image "+(img??"absente"));
  if(/netlify\.app/.test(String(html).match(/<head>[\s\S]*<\/head>/)?.[0]??""))bad.push("l'en-tête cite encore netlify.app");
  return {label,ok:bad.length===0,detail:bad.join(" ; ")||"liens de partage sur "+new URL(site).hostname};
}
export async function migrationChecks(site,publications,{fetcher=fetch,redirections=[],legacy=LEGACY}={}){
  const get=(u,o={})=>fetcher(u,{redirect:"follow",signal:AbortSignal.timeout(15000),headers:{"User-Agent":"MUNDI-Production-Smoke/1.0"},...o});
  const out=[];
  const run=async(label,fn)=>{try{out.push({label,...(await fn())})}catch(e){out.push({label,ok:false,detail:String(e?.message||e).slice(0,150)})}};
  const latest=publications.filter(p=>p?.status==="published").sort((a,b)=>String(b.publishedAt).localeCompare(String(a.publishedAt)))[0];
  await run("Accueil : partage",async()=>shareCheck("Accueil : partage",await (await get(site+"/")).text(),site,"/"));
  if(latest)await run("Article : partage",async()=>{const p="/actualites/"+latest.slug+"/";return shareCheck("Article : partage",await (await get(site+p)).text(),site,p)});
  await run("Dossier cobalt",async()=>{const p="/dossiers/cobalt-congolais/";const r=await get(site+p);const html=await r.text();const c=shareCheck("",html,site,p);
    return {ok:r.ok&&html.includes("Suivre ce dossier")&&c.ok,detail:r.ok?(html.includes("Suivre ce dossier")?c.detail:"bouton « Suivre ce dossier » absent"):"HTTP "+r.status}});
  await run("Bibliothèque et transfert",async()=>{const a=await get(site+"/enregistres/"),b=await get(site+"/transfert/");const ok=a.ok&&b.ok&&(await a.text()).includes("/transfert/");return {ok,detail:ok?"lien de récupération présent":"HTTP "+a.status+" / "+b.status}});
  await run("Manifeste",async()=>{const r=await get(site+"/manifest.webmanifest");const m=r.ok?await r.json():null;return {ok:m?.start_url==="/",detail:r.ok?"start_url "+m?.start_url:"HTTP "+r.status}});
  for(const r of redirections)await run("Ancienne URL "+r.from.slice(0,24)+"…",async()=>{const res=await get(site+"/actualites/"+r.from+"/?ref=controle");const u=new URL(res.url);
    const ok=res.ok&&u.origin===site&&u.pathname==="/actualites/"+r.to+"/";return {ok,detail:ok?"mène à "+u.pathname:"arrivée "+u.pathname+" (HTTP "+res.status+")"}});
  await run("Notifications",async()=>{const r=await get(site+"/api/push",{headers:{Accept:"application/json"}});const j=await r.json();return {ok:r.ok&&typeof j.enabled==="boolean",info:true,detail:j.enabled?"ouvertes (clé publique servie)":"indisponibles (enabled: false) : secrets VAPID à ajouter sur Cloudflare"}});
  await run("Ancienne adresse Netlify",async()=>{const r=await get(legacy+"/explorer/?q=cobalt",{redirect:"manual"});const loc=r.headers.get("location")??"";
    const moved=[301,302,308].includes(r.status)&&loc.startsWith(site+"/explorer/");const t=await get(legacy+"/transfert/",{redirect:"manual"});
    return {ok:moved&&t.status===200,info:true,detail:moved?"redirige ("+r.status+") vers "+loc+" ; /transfert/ "+(t.status===200?"servie":"HTTP "+t.status):"pas encore redirigée (HTTP "+r.status+")"}});
  return out;
}
/** Version déployée : out/version.json, écrit au build (scripts/cloudflare-files.mjs). */
export async function deployedVersion(site,fetcher=fetch){
  try{const r=await fetcher(site+"/version.json",{cache:"no-store",signal:AbortSignal.timeout(15000),headers:{"User-Agent":"MUNDI-Production-Smoke/1.0"}});return r.ok?await r.json():null}catch{return null}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const publications=JSON.parse(readFileSync("content/publications.json","utf8"));
  const targets=checkTargets(publications);
  // MUNDI_EXPECT_COMMIT (contrôle après fusion sur main) : attendre que Cloudflare serve ce commit, 12 min au plus.
  const commit=process.env.MUNDI_EXPECT_COMMIT;
  if(commit){
    let v=null;
    for(let i=0;i<36;i++){v=await deployedVersion(SITE);if(v?.commit===commit)break;if(i===0)console.log("En attente du déploiement Cloudflare du commit "+commit.slice(0,7)+"…");await sleep(20000)}
    if(v?.commit!==commit)console.log("FAIL version : Cloudflare sert "+JSON.stringify(v)+" au lieu du commit "+commit+". Vérifier Workers & Pages > mundi > Deployments (build échoué ?).");
    process.env.MUNDI_EXPECT_BUILD=v?.commit===commit?v.build:"commit "+commit;
  }
  let report;
  for(let attempt=1;attempt<=6;attempt++){
    report={...(await probe(SITE,targets)),attempt,checkedAt:new Date().toISOString(),
      expectedPublications:publications.filter(p=>p.status==="published").length};
    console.log("MUNDI production smoke attempt "+attempt+": "+(report.ok?"OK":"NOT READY"));
    report.results.forEach(x=>console.log((x.ok?"OK ":"FAIL ")+x.path+(x.error?" — "+x.error:"")));
    if(report.ok)break;
    if(attempt<6)await sleep(20000);
  }
  // Nouveautés : photos et MP3 des dernières publications ; date de l'édition servie.
  const read=f=>{try{return JSON.parse(readFileSync(f,"utf8"))}catch{return []}};
  report.assets=await probeAssets(SITE,assetTargets(publications,read("content/editorial-images.json"),read("content/article-audio.json")));
  try{
    const home=await fetch(SITE+"/",{headers:{Accept:"text/html","User-Agent":"MUNDI-Production-Smoke/1.0"},signal:AbortSignal.timeout(15000)});
    report.edition=editionCheck(await home.text());
  }catch(e){report.edition={ok:false,error:String(e?.message||e).slice(0,150)}}
  report.migration=await migrationChecks(SITE,publications,{redirections:read("content/redirections.json")});
  report.version=await deployedVersion(SITE);
  // MUNDI_EXPECT_BUILD : identifiant du build que le workflow vient de déployer (écart de version = échec).
  const expect=process.env.MUNDI_EXPECT_BUILD;
  report.versionOk=!expect||report.version?.build===expect;
  console.log((report.versionOk?"OK ":"FAIL ")+"version servie "+JSON.stringify(report.version)+(expect?" (attendue : "+expect+")":""));
  report.migration.forEach(x=>console.log((x.ok?"OK ":x.info?"INFO ":"FAIL ")+x.label+" — "+x.detail));
  // MUNDI_CHECK_EDITION=1 (passage d'après minuit) : une édition périmée fait échouer le contrôle.
  if(report.assets.some(x=>!x.ok)||(process.env.MUNDI_CHECK_EDITION==="1"&&!report.edition.ok)||!report.versionOk||report.migration.some(x=>!x.ok&&!x.info))report.ok=false;
  report.assets.filter(x=>!x.ok).forEach(x=>console.log("FAIL "+x.path+" — "+x.error));
  console.log((report.edition.ok?"OK ":"ATTENTION ")+"édition servie "+(report.edition.served??"?")+" (Paris : "+(report.edition.expected??"?")+")"+(report.edition.error?" — "+report.edition.error:""));
  mkdirSync("reports",{recursive:true});
  writeFileSync("reports/production-smoke.json",JSON.stringify(report,null,2)+"\n");
  if(process.env.GITHUB_STEP_SUMMARY){
    const md=["## MUNDI — contrôle de production ("+HOST+")", "",report.ok?"Production verified":"Production NOT yet verified","",
      "Source SHA: "+(process.env.GITHUB_SHA||"unknown"),
      "Expected publications in code: "+report.expectedPublications,
      "Attempts: "+report.attempt,"",
      ...report.results.map(x=>"- "+(x.ok?"✅":"❌")+" `"+x.path+"` "+(x.error||"HTTP "+x.status)),
      "","Photos et MP3 des dernières publications :",
      ...report.assets.map(x=>"- "+(x.ok?"✅":"❌")+" `"+x.path+"` "+(x.error||"HTTP "+x.status)),
      "","Édition servie : "+(report.edition.served??"inconnue")+" (Paris : "+(report.edition.expected??"?")+") "+(report.edition.ok?"✅":"⚠️ "+report.edition.error),
      "","Version servie : "+(report.version?("build `"+report.version.build+"`, commit `"+String(report.version.commit).slice(0,7)+"`, édition "+report.version.editionDay):"inconnue (version.json absent)")+(report.versionOk?" ✅":" ❌ attendue "+expect),
      "","Changement d'adresse (#129) :",
      ...report.migration.map(x=>"- "+(x.ok?"✅":x.info?"ℹ️":"❌")+" "+x.label+" — "+x.detail),
      "","This validates pages and deployed content availability, not editorial factual accuracy."].join("\n");
    writeFileSync(process.env.GITHUB_STEP_SUMMARY,md+"\n",{flag:"a"});
  }
  if(!report.ok)process.exitCode=1;
}
