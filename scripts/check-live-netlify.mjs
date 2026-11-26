#!/usr/bin/env node
/**
 * MUNDI production smoke check, no API keys and no publishing.
 * Inspect the real Netlify host, not a GitHub CI/Netlify deploy-preview.
 */
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";

const SITE="https://mundiapptest.netlify.app";
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
      else if(effective.hostname!=="mundiapptest.netlify.app")error="Unexpected redirect";
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
  if(served<expected)return {ok:false,served,expected,error:`Le site servi date du ${served} alors qu'on est le ${expected} à Paris : relancer un déploiement Netlify (crochet NETLIFY_BUILD_HOOK ou « Trigger deploy »).`};
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
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const publications=JSON.parse(readFileSync("content/publications.json","utf8"));
  const targets=checkTargets(publications);
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
  // MUNDI_CHECK_EDITION=1 (passage d'après minuit) : une édition périmée fait échouer le contrôle.
  if(report.assets.some(x=>!x.ok)||(process.env.MUNDI_CHECK_EDITION==="1"&&!report.edition.ok))report.ok=false;
  report.assets.filter(x=>!x.ok).forEach(x=>console.log("FAIL "+x.path+" — "+x.error));
  console.log((report.edition.ok?"OK ":"ATTENTION ")+"édition servie "+(report.edition.served??"?")+" (Paris : "+(report.edition.expected??"?")+")"+(report.edition.error?" — "+report.edition.error:""));
  mkdirSync("reports",{recursive:true});
  writeFileSync("reports/production-smoke.json",JSON.stringify(report,null,2)+"\n");
  if(process.env.GITHUB_STEP_SUMMARY){
    const md=["## MUNDI — Netlify production smoke", "",report.ok?"Production verified":"Production NOT yet verified","",
      "Source SHA: "+(process.env.GITHUB_SHA||"unknown"),
      "Expected publications in code: "+report.expectedPublications,
      "Attempts: "+report.attempt,"",
      ...report.results.map(x=>"- "+(x.ok?"✅":"❌")+" `"+x.path+"` "+(x.error||"HTTP "+x.status)),
      "","Photos et MP3 des dernières publications :",
      ...report.assets.map(x=>"- "+(x.ok?"✅":"❌")+" `"+x.path+"` "+(x.error||"HTTP "+x.status)),
      "","Édition servie : "+(report.edition.served??"inconnue")+" (Paris : "+(report.edition.expected??"?")+") "+(report.edition.ok?"✅":"⚠️ "+report.edition.error),
      "","This validates pages and deployed content availability, not editorial factual accuracy."].join("\n");
    writeFileSync(process.env.GITHUB_STEP_SUMMARY,md+"\n",{flag:"a"});
  }
  if(!report.ok)process.exitCode=1;
}
