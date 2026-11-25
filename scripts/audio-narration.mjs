/**
 * Texte lu par la voix de MUNDI : uniquement le contenu publié et vérifié
 * (titre, résumé, points clés), mis en forme pour l'oreille. Rien n'est inventé.
 */
const ORDER=["D'abord","Ensuite","Enfin"];
/**
 * Un article du pilote « Aujourd'hui » peut avoir un script parlé de 45 à 75 secondes,
 * écrit pour l'oreille à partir de l'article (content/decryptages.json, champ audioScript) :
 * il remplace alors la lecture du titre, du résumé et des points clés.
 */
export function narrationFor(p,decryptage){
  const script=decryptage?.audioScript;
  if(typeof script==="string"&&script.trim().length>=300)return script.trim();
  const points=(p.keyPoints||[]).map((x,i,all)=>{
    const lead=all.length<=3?ORDER[i===all.length-1&&all.length>1?2:i]:"Point "+(i+1);
    return lead+" : "+x.trim();
  });
  return [
    p.title.trim().replace(/[.!?…]?$/,"."),
    p.summary.trim(),
    points.length?(points.length===3?"L'essentiel en trois points.":"L'essentiel à retenir."):"",
    ...points,
    "Retrouvez les sources de cet article sur MUNDI.",
  ].filter(Boolean).join("\n\n");
}
