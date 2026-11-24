/**
 * MUNDI : fabrique la version audio (MP3) de chaque article publié, avec une voix
 * libre et gratuite (Piper, voix française « SIWIS », licence CC BY 4.0).
 * Aucun service payant ni clé d'API : tout tourne sur la machine GitHub Actions.
 *
 * - texte lu : uniquement le contenu publié (voir audio-narration.mjs) ;
 * - un article corrigé (texte différent) est réenregistré ;
 * - un article retiré perd son fichier audio.
 *
 * Utilisation : node scripts/generate-article-audio.mjs
 *   MUNDI_PIPER_MODEL : chemin du modèle .onnx (défaut voices/fr_FR-siwis-medium.onnx)
 *   MUNDI_AUDIO_MAX   : nombre maximal d'articles à enregistrer par passage (défaut 40)
 */
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {existsSync,mkdirSync,readFileSync,rmSync,writeFileSync} from "node:fs";
import {narrationFor} from "./audio-narration.mjs";

export const VOICE={id:"piper-fr_FR-siwis-medium",lengthScale:"1.05",sentenceSilence:"0.35",bitrate:"48k"};
export const MANIFEST="content/article-audio.json";
export const DIR="public/media/audio";

export const hashOf=text=>createHash("sha256").update(VOICE.id+"|"+VOICE.lengthScale+"|"+text).digest("hex").slice(0,16);

/** Ce qu'il faut enregistrer, garder ou supprimer. Pure : testable sans Piper. */
export function planAudio(publications,manifest,max=40){
  const published=publications.filter(p=>p.status==="published"&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug));
  const keep=[],todo=[];
  for(const p of published){
    const text=narrationFor(p),hash=hashOf(text),entry=manifest[p.slug];
    if(entry&&entry.hash===hash)keep.push(p.slug);
    else todo.push({slug:p.slug,text,hash,updatedAt:p.updatedAt||p.publishedAt});
  }
  const live=new Set(published.map(p=>p.slug));
  const remove=Object.keys(manifest).filter(s=>!live.has(s));
  return {keep,todo:todo.slice(0,max),remove,waiting:Math.max(0,todo.length-max)};
}

function run(cmd,args,input){
  const r=spawnSync(cmd,args,{input,encoding:"utf8",maxBuffer:1<<26});
  if(r.status!==0)throw new Error(cmd+" a échoué : "+String(r.stderr||r.error||"").slice(-400));
  return r.stdout;
}

/** Piper → WAV, puis ffmpeg → MP3 mono au volume normalisé. Renvoie la durée en secondes. */
export function record({slug,text},model){
  const wav=DIR+"/"+slug+".wav",mp3=DIR+"/"+slug+".mp3";
  run("python",["-m","piper","-m",model,"-f",wav,"--length-scale",VOICE.lengthScale,"--sentence-silence",VOICE.sentenceSilence],text);
  run("ffmpeg",["-loglevel","error","-y","-i",wav,"-af","loudnorm=I=-16:TP=-1.5","-ac","1","-ar","22050","-b:a",VOICE.bitrate,mp3]);
  rmSync(wav,{force:true});
  const d=Number(run("ffprobe",["-v","error","-show_entries","format=duration","-of","csv=p=0",mp3]).trim());
  return Math.round(d)||0;
}

export function generateArticleAudio({publications,manifest,model,max=40,recorder=record,now=new Date().toISOString()}){
  const plan=planAudio(publications,manifest,max);
  const next={};
  for(const slug of plan.keep)next[slug]=manifest[slug];
  mkdirSync(DIR,{recursive:true});
  const failed=[];
  for(const item of plan.todo){
    try{
      const duration=recorder(item,model);
      next[item.slug]={src:"/media/audio/"+item.slug+".mp3",hash:item.hash,updatedAt:item.updatedAt,
        duration,voice:VOICE.id,generatedAt:now};
    }catch(e){
      failed.push(item.slug);
      console.error("Audio impossible pour",item.slug,"—",e.message);
      if(manifest[item.slug])rmSync(DIR+"/"+item.slug+".mp3",{force:true});
    }
  }
  for(const slug of plan.remove)rmSync(DIR+"/"+slug+".mp3",{force:true});
  const sorted=Object.fromEntries(Object.keys(next).sort().map(k=>[k,next[k]]));
  return {manifest:sorted,recorded:plan.todo.length-failed.length,failed,removed:plan.remove,waiting:plan.waiting};
}

if(import.meta.url==="file://"+process.argv[1]){
  const model=process.env.MUNDI_PIPER_MODEL||"voices/fr_FR-siwis-medium.onnx";
  const publications=JSON.parse(readFileSync("content/publications.json","utf8"));
  const manifest=existsSync(MANIFEST)?JSON.parse(readFileSync(MANIFEST,"utf8")):{};
  const r=generateArticleAudio({publications,manifest,model,max:Number(process.env.MUNDI_AUDIO_MAX||40)});
  writeFileSync(MANIFEST,JSON.stringify(r.manifest,null,1)+"\n");
  console.log(JSON.stringify({recorded:r.recorded,failed:r.failed,removed:r.removed,waiting:r.waiting}));
  if(r.failed.length&&!r.recorded)process.exitCode=1;
}
