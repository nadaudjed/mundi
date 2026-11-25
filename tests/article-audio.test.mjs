import test from "node:test";
import assert from "node:assert/strict";
import {narrationFor} from "../scripts/audio-narration.mjs";
import {planAudio,generateArticleAudio,hashOf} from "../scripts/generate-article-audio.mjs";

const art=(slug,extra={})=>({slug,status:"published",title:"Titre "+slug,summary:"Résumé vérifié.",
  keyPoints:["Un.","Deux.","Trois."],updatedAt:"2026-11-24T10:00:00Z",...extra});

test("le texte lu ne contient que le contenu publié, mis en forme pour l'oreille",()=>{
  const t=narrationFor(art("a"));
  assert.match(t,/^Titre a\./);
  assert.match(t,/L'essentiel en trois points\./);
  assert.match(t,/D'abord : Un\.[\s\S]*Ensuite : Deux\.[\s\S]*Enfin : Trois\./);
});

test("seuls les articles nouveaux ou corrigés sont enregistrés ; les retirés sont supprimés",()=>{
  const a=art("a"),b=art("b");
  const manifest={a:{hash:hashOf(narrationFor(a))},b:{hash:"ancien"},vieux:{hash:"x"}};
  const plan=planAudio([a,b,art("c",{status:"draft"})],manifest);
  assert.deepEqual(plan.keep,["a"]);
  assert.deepEqual(plan.todo.map(x=>x.slug),["b"]);
  assert.deepEqual(plan.remove,["vieux"]);
});

test("le manifeste garde la source locale, l'empreinte et la durée ; un échec n'empêche pas les autres",()=>{
  const r=generateArticleAudio({publications:[art("a"),art("b")],manifest:{},model:"m",now:"T",
    recorder:(item)=>{if(item.slug==="b")throw new Error("boom");return 61;}});
  assert.deepEqual(Object.keys(r.manifest),["a"]);
  assert.equal(r.manifest.a.src,"/media/audio/a.mp3");
  assert.equal(r.manifest.a.duration,61);
  assert.deepEqual(r.failed,["b"]);
});

test("un script parlé du pilote remplace la lecture du résumé et change l'empreinte",()=>{
  const a=art("a");
  const script="Script parlé. ".repeat(30);
  assert.equal(narrationFor(a,{audioScript:script}),script.trim());
  assert.equal(narrationFor(a,{audioScript:"trop court"}),narrationFor(a));
  const manifest={a:{hash:hashOf(narrationFor(a))}};
  assert.deepEqual(planAudio([a],manifest).keep,["a"]);
  assert.deepEqual(planAudio([a],manifest,40,{a:{audioScript:script}}).todo.map(x=>x.slug),["a"]);
});
