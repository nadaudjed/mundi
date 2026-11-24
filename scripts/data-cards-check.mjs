/**
 * Contrôle, côté rédaction automatique, des cartes « Données » proposées par les agents.
 * Mêmes règles que lib/data-cards.ts (validateDataCards), qui fait échouer la construction du site
 * si une carte publiée est mal formée : une carte refusée ici est retirée, l'article reste publiable.
 * Les agents ne fournissent ni visuel, ni fond, ni style : les photos viennent du catalogue approuvé.
 */
const isText=(v,min=1,max=400)=>typeof v==="string"&&v.trim().length>=min&&v.trim().length<=max;
const isDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v));
const isRatio=u=>/%|pour ?cent|pour ?mille|‰|part|taux|ratio/i.test(u);
const https=v=>{try{const u=new URL(v);return u.protocol==="https:"&&!u.username&&!u.password}catch{return false}};
function measure(m,where,errors){
  if(!m||typeof m!=="object")return void errors.push(where+" : valeur manquante");
  if(typeof m.value!=="number"||!Number.isFinite(m.value))errors.push(where+" : la valeur doit être un nombre");
  if(!isText(m.unit,1,60))errors.push(where+" : unité manquante");
  if(!isText(m.label,3,120))errors.push(where+" : préciser ce que mesure la valeur");
  if(!isText(m.scope,2,120))errors.push(where+" : périmètre manquant");
  if(!isText(m.period,2,60))errors.push(where+" : période manquante");
  if(typeof m.unit==="string"&&isRatio(m.unit)&&!isText(m.denominator,3,120))errors.push(where+" : un pourcentage ou un ratio doit indiquer son dénominateur");
  if(m.decimals!==undefined&&(!Number.isInteger(m.decimals)||m.decimals<0||m.decimals>3))errors.push(where+" : nombre de décimales invalide");
}
const MEASURE_KEYS=["value","unit","label","scope","period","denominator","decimals"];
const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>o?.[k]!==undefined).map(k=>[k,o[k]]));
/** Garde seulement les champs que les agents ont le droit de remplir. */
export function cleanCard(c){
  const base=pick(c,["id","kind","headline","source","asOf","note"]);
  if(base.source)base.source=pick(base.source,["label","url"]);
  if(c?.kind==="stat")return {...base,measure:pick(c.measure,MEASURE_KEYS),...pick(c,["context"])};
  if(c?.kind==="comparaison")return {...base,items:(Array.isArray(c.items)?c.items:[]).map(m=>pick(m,MEASURE_KEYS)),presentation:c.presentation};
  if(c?.kind==="explication")return {...base,steps:(Array.isArray(c.steps)?c.steps:[]).map(s=>pick(s,["label","text","nature"])),...pick(c,["layout"])};
  return base;
}
/** Erreurs d'une séquence de cartes ; chaque source doit être une des sources de l'article. */
export function dataCardErrors(cards,sourceUrls=[]){
  if(!Array.isArray(cards))return ["La séquence doit être une liste de cartes"];
  const errors=[],ids=new Set(),allowed=new Set(sourceUrls);
  if(cards.length<2||cards.length>4)errors.push("Une séquence contient 2 à 4 cartes");
  cards.forEach((c,i)=>{
    const where="Carte "+(i+1);
    if(!c||typeof c!=="object")return void errors.push(where+" : carte invalide");
    if(typeof c.id!=="string"||!/^[a-z0-9-]{1,60}$/.test(c.id)||ids.has(c.id))errors.push(where+" : identifiant manquant ou en double");else ids.add(c.id);
    if(!isText(c.headline,3,140))errors.push(where+" : accroche manquante ou trop longue (140 caractères)");
    if(!isText(c.source?.label,2,120)||!https(c.source?.url))errors.push(where+" : source HTTPS requise");
    else if(!allowed.has(c.source.url))errors.push(where+" : la source doit être une des sources de l'article");
    if(!isDate(c.asOf))errors.push(where+" : date de la donnée invalide (AAAA-MM-JJ)");
    if(c.note!==undefined&&!isText(c.note,3,400))errors.push(where+" : note méthodologique invalide");
    if(c.kind==="stat"){measure(c.measure,where,errors);if(c.context!==undefined&&!isText(c.context,3,240))errors.push(where+" : contexte invalide");}
    else if(c.kind==="comparaison"){
      const items=Array.isArray(c.items)?c.items:[];
      if(items.length<2||items.length>4)errors.push(where+" : une comparaison contient 2 à 4 valeurs");
      items.forEach((m,j)=>measure(m,where+", valeur "+(j+1),errors));
      if(c.presentation==="echelle-commune"){
        if(new Set(items.map(m=>m?.unit)).size>1||new Set(items.map(m=>m?.denominator??"")).size>1)
          errors.push(where+" : une échelle commune exige la même unité et le même dénominateur ; utilisez « valeurs-distinctes »");
        if(items.some(m=>typeof m?.value==="number"&&m.value<0))errors.push(where+" : pas de barres pour des valeurs négatives");
      }else if(c.presentation!=="valeurs-distinctes")errors.push(where+" : présentation inconnue");
    }else if(c.kind==="explication"){
      const steps=Array.isArray(c.steps)?c.steps:[];
      if(steps.length<2||steps.length>5)errors.push(where+" : une explication contient 2 à 5 étapes");
      if(c.layout!==undefined&&c.layout!=="sequence"&&c.layout!=="alternatives")errors.push(where+" : présentation d'explication inconnue");
      if(c.layout==="alternatives"&&steps.length<3)errors.push(where+" : des alternatives exigent un point de départ et au moins deux issues");
      steps.forEach((s,j)=>{if(!isText(s?.label,2,60)||!isText(s?.text,5,240)||!["fait","hypothese"].includes(String(s?.nature)))
        errors.push(where+", étape "+(j+1)+" : titre, texte et nature (fait ou hypothese) requis");});
    }else errors.push(where+" : type inconnu (stat, comparaison ou explication)");
  });
  return errors;
}
/** Cartes publiables (nettoyées) ou undefined si absentes ou invalides. */
export function publishableCards(draft){
  if(draft?.dataCards===undefined)return undefined;
  const cards=Array.isArray(draft.dataCards)?draft.dataCards.map(cleanCard):draft.dataCards;
  return dataCardErrors(cards,(draft.sources??[]).map(s=>s?.url)).length?undefined:cards;
}

/**
 * Cartes mémoire (« Réviser ») : mêmes règles que lib/editorial.ts.
 * 1 à 6 cartes ; question de 10 à 160 caractères finissant par « ? » ; réponse de 3 à 280 caractères.
 */
export function flashcardErrors(cards){
  if(!Array.isArray(cards))return ["Les cartes mémoire doivent être une liste"];
  const errors=[];
  if(cards.length<1||cards.length>6)errors.push("1 à 6 cartes mémoire");
  cards.forEach((c,i)=>{
    const q=typeof c?.question==="string"?c.question.trim():"",a=typeof c?.answer==="string"?c.answer.trim():"";
    if(q.length<10||q.length>160||!q.endsWith("?"))errors.push("Carte mémoire "+(i+1)+" : question de 10 à 160 caractères terminée par « ? »");
    if(a.length<3||a.length>280)errors.push("Carte mémoire "+(i+1)+" : réponse de 3 à 280 caractères");
  });
  return errors;
}
/** Cartes mémoire publiables (nettoyées) ou undefined si absentes ou invalides. */
export function publishableFlashcards(draft){
  if(!Array.isArray(draft?.flashcards)||!draft.flashcards.length)return undefined;
  const cards=draft.flashcards.map(c=>({question:String(c?.question??"").trim(),answer:String(c?.answer??"").trim()}));
  return flashcardErrors(cards).length?undefined:cards;
}
