/**
 * Texte lu par la voix de MUNDI : uniquement le contenu publié et vérifié
 * (titre, résumé, points clés), mis en forme pour l'oreille. Rien n'est inventé.
 */
const ORDER=["D'abord","Ensuite","Enfin"];
export function narrationFor(p){
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
