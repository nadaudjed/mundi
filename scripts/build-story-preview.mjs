#!/usr/bin/env node
/**
 * MUNDI V10: a self-contained, INTERNAL editorial preview (never deployed).
 * Statistics are HTML text, never painted into generated imagery.
 * It does not edit content/publications.json or any deployed site files.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { validateReviewDraft } from "./validate-review-packs.mjs";

const DRAFT_PATH = "editorial/reviews/textile-2024/draft.json";
const STORY_PATH = "editorial/reviews/textile-2024/visual-story.json";
const STYLE_PATH = "design/internal-story-v10/preview.css";
const CLIENT_PATH = "design/internal-story-v10/preview.client.js";
const OUT = "reports/editorial-story-v10.html";
const KINDS = ["stat", "comparison", "ratio", "context"];

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}
function str(v, max=500) { return typeof v === "string" && v.trim().length > 0 && v.length <= max; }
function https(url) {
  try { const u=new URL(url); return u.protocol==="https:" && !u.username && !u.password; }
  catch { return false; }
}
function finite(v, max=1000000) { return typeof v==="number" && Number.isFinite(v) && v>=0 && v<=max; }

export function validatePreview(story, draft) {
  const errors=validateReviewDraft(draft);
  if (!story || typeof story!=="object" || Array.isArray(story)) return errors.concat("Visual story is not an object");
  if (story.format!=="mundi-internal-story-v1" || story.status!=="draft" || story.draftPath!==DRAFT_PATH)
    errors.push("Only the internal unapproved textile draft is eligible for this private preview");
  if (!Array.isArray(story.scenes) || story.scenes.length!==4) return errors.concat("Exactly four scenes required");
  const ids=new Set();
  for(const [i,scene] of story.scenes.entries()) {
    const at="Scene "+(i+1);
    if (!scene || typeof scene!=="object") { errors.push(at+": invalid");continue; }
    if (!str(scene.id,50) || !/^[a-z0-9-]+$/.test(scene.id) || ids.has(scene.id)) errors.push(at+": duplicate/invalid id");
    ids.add(scene.id);
    if (scene.kind!==KINDS[i]) errors.push(at+": unexpected scene type");
    for(const prop of ["headline","kicker"]) if (!str(scene[prop],180)) errors.push(at+": invalid "+prop);
    if (!Number.isInteger(scene.sourceIndex) || !draft.sources?.[scene.sourceIndex] || !https(draft.sources[scene.sourceIndex].url))
      errors.push(at+": HTTPS source from the original draft required");
    if (scene.kind==="stat" || scene.kind==="ratio") {
      if (!finite(scene.value) || !str(scene.unit,60) || !str(scene.label,130) ||
          !str(scene.scope,130) || !str(scene.period,60) || !str(scene.caption,400))
        errors.push(at+": incomplete numerical context");
      if (scene.kind==="ratio" && (scene.value>100 || scene.unit!=="%" || !str(scene.denominator,180)))
        errors.push(at+": percentage requires explicit denominator");
    }
    if (scene.kind==="comparison") {
      if (!Array.isArray(scene.items) || scene.items.length!==2 || !str(scene.caption,400))
        errors.push(at+": invalid comparison");
      else {
        const units=new Set(scene.items.map(m=>m?.unit));
        for(const m of scene.items) if(!m || !finite(m.value) || !str(m.label) || !str(m.unit) ||
            !str(m.scope) || !str(m.period)) errors.push(at+": incomplete measure");
        if (units.size!==1) errors.push(at+": comparisons require matching units");
      }
    }
    if (scene.kind==="context") {
      for(const prop of ["statement","details","uncertainty"]) if(!str(scene[prop],450))
        errors.push(at+": missing "+prop);
    }
  }
  return errors;
}
function num(value,decimals=0) {
  const digits=Number.isInteger(decimals) && decimals>=0 && decimals<=3 ? decimals : 0;
  return new Intl.NumberFormat("fr-FR",{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
}
function sourceFooter(source, i) {
  return '<div class="source">SOURCE '+String(i+1).padStart(2,"0")+
    ' <a href="'+escapeHtml(source.url)+'" target="_blank" rel="noopener noreferrer">'+
    escapeHtml(source.label)+'<span class="sr"> (nouvel onglet)</span></a></div>';
}
function metric(scene) {
  const value='<div class="statistic"><span class="statistic__value">'+escapeHtml(num(scene.value,scene.decimals))+
    '</span><span class="statistic__unit">'+escapeHtml(scene.unit)+'</span></div>';
  const label='<p class="metric-label">'+escapeHtml(scene.label)+'<span class="meta-dot">·</span>'+
    escapeHtml(scene.scope)+'<span class="meta-dot">·</span>'+escapeHtml(scene.period)+'</p>';
  const denominator=scene.kind==="ratio" ? '<p class="denominator">Dénominateur : '+escapeHtml(scene.denominator)+'</p>' : '';
  return value+label+denominator+'<p class="caution">'+escapeHtml(scene.caption)+'</p>';
}
function comparison(scene) {
  const max=Math.max(...scene.items.map(x=>x.value),0.00001);
  const li=scene.items.map((m,i)=>{
    const width=Math.max(0,Math.min(100,m.value/max*100));
    return '<li class="comparison-item"><div class="comparison-row"><strong>'+escapeHtml(m.label)+
      '</strong><span>'+escapeHtml(num(m.value,m.decimals))+' '+escapeHtml(m.unit)+'</span></div>'+
      '<p class="comparison-context">'+escapeHtml(m.scope)+' · '+escapeHtml(m.period)+'</p>'+
      '<div class="track" aria-hidden="true"><span class="track-fill track-fill--'+i+
      '" style="width:'+width.toFixed(3)+'%"></span></div></li>';
  }).join("");
  return '<ul class="comparison-list">'+li+'</ul><p class="caution">'+escapeHtml(scene.caption)+'</p>';
}
function context(scene) {
  return '<p class="policy">'+escapeHtml(scene.statement)+'</p>'+
    '<p class="explanation">'+escapeHtml(scene.details)+'</p>'+
    '<p class="caution"><span class="caution-heading">Ce que l’on ne sait pas encore.</span> '+
    escapeHtml(scene.uncertainty)+'</p>';
}
function panel(scene,i,draft) {
  const body=scene.kind==="comparison" ? comparison(scene) : scene.kind==="context" ? context(scene) : metric(scene);
  return '<section class="scene scene--'+escapeHtml(scene.kind)+'" id="scene-'+i+
    '" data-scene="'+i+'" aria-labelledby="title-'+i+'" tabindex="-1">'+
    '<div class="scene__texture" aria-hidden="true"></div><div class="scene__fade" aria-hidden="true"></div>'+
    '<div class="scene__content"><p class="kicker">'+escapeHtml(scene.kicker)+'</p>'+
    '<h2 id="title-'+i+'" class="headline">'+escapeHtml(scene.headline)+'</h2>'+body+
    '</div><div class="scene__footer">'+sourceFooter(draft.sources[scene.sourceIndex],scene.sourceIndex)+
    '<button class="next" type="button" data-next="'+i+'">'+
    (i===3?"Revenir au début":"Découvrir la suite")+' <span aria-hidden="true">'+
    (i===3?"↑":"↓")+'</span></button></div></section>';
}
export function makePreviewHtml(story,draft,css="",client="") {
  const errors=validatePreview(story,draft);
  if(errors.length) throw new Error("Preview rejected: "+errors.join("; "));
  const nav=story.scenes.map((scene,i)=>'<button type="button" data-goto="'+i+
    '" aria-label="Aller à l’écran '+(i+1)+' sur 4"'+(i===0?' aria-current="step"':'')+'></button>').join("");
  const screens=story.scenes.map((scene,i)=>panel(scene,i,draft)).join("\n");
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
    '<meta name="robots" content="noindex,nofollow"><title>MUNDI — aperçu interne non publié</title>'+
    '<style>'+css+'</style></head><body><a class="skip" href="#scene-0">Aller au récit</a>'+
    '<header class="navigation"><div class="navigation__row"><div class="wordmark">MUNDI</div>'+
    '<div class="nav-actions"><button id="reading" type="button" aria-pressed="false">Lecture</button>'+
    '<button id="pause" type="button" aria-pressed="false">Pause</button>'+
    '<span class="status">Brouillon · non publié</span></div></div>'+
    '<nav class="progress" aria-label="Navigation du récit">'+nav+'</nav></header>'+
    '<main id="scroller" class="scroller">'+screens+'</main>'+
    '<div class="internal-mark" aria-hidden="true">MUNDI / Relecture interne · aucune approbation</div>'+
    '<script>'+client+'</script></body></html>';
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const draft=JSON.parse(readFileSync(resolve(DRAFT_PATH),"utf8"));
  const story=JSON.parse(readFileSync(resolve(STORY_PATH),"utf8"));
  const css=readFileSync(resolve(STYLE_PATH),"utf8");
  const client=readFileSync(resolve(CLIENT_PATH),"utf8");
  const html=makePreviewHtml(story,draft,css,client);
  const target=resolve(process.env.MUNDI_STORY_OUT||OUT);
  mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,html,"utf8");
  console.log("MUNDI V10 internal preview saved: "+target+"; "+story.scenes.length+" scenes. No publication.");
}
