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
  mkdirSync("reports",{recursive:true});
  writeFileSync("reports/production-smoke.json",JSON.stringify(report,null,2)+"\n");
  if(process.env.GITHUB_STEP_SUMMARY){
    const md=["## MUNDI — Netlify production smoke", "",report.ok?"Production verified":"Production NOT yet verified","",
      "Source SHA: "+(process.env.GITHUB_SHA||"unknown"),
      "Expected publications in code: "+report.expectedPublications,
      "Attempts: "+report.attempt,"",
      ...report.results.map(x=>"- "+(x.ok?"✅":"❌")+" `"+x.path+"` "+(x.error||"HTTP "+x.status)),
      "","This validates pages and deployed content availability, not editorial factual accuracy."].join("\n");
    writeFileSync(process.env.GITHUB_STEP_SUMMARY,md+"\n",{flag:"a"});
  }
  if(!report.ok)process.exitCode=1;
}
