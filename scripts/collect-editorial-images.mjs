/**
 * MUNDI: select illustrative photographs for PUBLISHED articles, from Wikimedia Commons.
 * No model API key required. Only a narrow set of openly licensed raster photos can
 * be downloaded; all author/license/source metadata is preserved, and each visual is
 * conspicuously labelled "photographie d'illustration" in the UI.
 * Never use these photographs as evidence of an event described in an article.
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync,rmSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";

export const MEDIA_CATALOG="content/editorial-images.json";
export const PHOTO_QUERIES={
  "geopolitique":"diplomatic conference",
  "economie":"market",
  "finance":"trading",
  "industrie":"factory",
  "materiaux-critiques":"mining",
  "energie":"wind turbines",
  "recyclage":"recycling",
  "environnement":"forest",
  "technologie":"microchip",
  "entreprises":"office",
  "afrique":"african city",
  "sciences-societe":"laboratory"
};
// Editors' French headlines are converted to short visual cues, NOT treated as
// exact documentary evidence of a specific person, event, place or date.
const HINTS=[
  // Sujets du 25/11 restés sans repère visuel : un jeu de plateau pour Gaza (« diplomacy »), une
  // statue de bronze pour le froid (« fonte à froid »), un enfant centrafricain pour un port libyen.
  [/aide humanitaire|humanitaire|\btentes\b|r[eé]fugi[eé]s|\bd[eé]plac[eé]s\b/i,["humanitarian aid trucks","humanitarian aid distribution","refugee camp tents"]],
  [/cancer|d[eé]pistage|mammograph/i,["mammography","breast cancer screening"]],
  [/logement|immobilier|r[eé]novation [eé]nerg|construction de maisons/i,["housing construction","residential building construction"]],
  [/imp[oô]ts?|fiscal|fraude [aà] la TVA|[eé]vasion fiscale/i,["European Commission Berlaymont","euro banknotes and coins"]],
  [/demande [eé]lectrique|vague de froid|premier froid|consommation d.[eé]lectricit[eé]/i,["electricity pylons winter","high voltage power lines snow","electricity substation"]],
  [/navire|corvette|cargo|port de [A-Z]|drones? nava/i,["naval ship harbour","cargo ship harbour"]],
  [/guimar[aã]es/i,["Guimarães"]],
  // Édition du 25/11 après-midi : sujets historiques et industriels sans repère, illustrés par des
  // photos génériques (drapeau, immeuble « Grand » pour le smog, poste électrique pour un navire).
  [/variole|vaccination/i,["smallpox vaccination","vaccination campaign"]],
  [/smog|pollution de l.air|puret[eé] de l.air/i,["smog London","air pollution city"]],
  [/d[eé]chets plastiques|plastique/i,["plastic waste recycling","plastic waste bales"]],
  [/cobalt|shaba|katanga/i,["cobalt mine Congo","copper cobalt mine Katanga"]],
  [/quantique|quantum/i,["quantum computer","quantum computing laboratory"]],
  // #125 : « fus[eé]e » sans limite de mot trouvait « refusée » (barge Mobro illustrée par Ariane 5).
  [/\bariane\b|\bfus[eé]es?\b|lanceur spatial/i,["Ariane 5 rocket","rocket launch Kourou"]],
  [/cha[iî]ne mobile|ford|mod[eè]le T/i,["Ford Model T assembly line","Highland Park Ford Plant"]],
  [/doctorat|doctorant|th[eè]se/i,["PhD students laboratory","doctoral students research"]],
  [/ind[eé]pendances?|d[eé]colonisation/i,["independence day Africa 1960","African independence celebration"]],
  [/lehman|faillite bancaire|crise financi[eè]re/i,["Lehman Brothers headquarters","financial crisis 2008 Wall Street"]],
  [/john law|compagnie des indes|krach/i,["John Law Banque Royale","Mississippi Company"]],
  [/black.out|panne g[eé]n[eé]rale|d[eé]lestage/i,["electricity control room","high voltage power lines"]],
  [/automobile|voitures?|usine de Hambach/i,["car factory assembly line","electric car production"]],
  [/textil|v[eê]tement|tri des d[eé]chets/i,["textile recycling sorting","clothing recycling"]],
  [/appels? d.offres|march[eé]s? publics?|commande publique/i,["public procurement","government contract signing"]],
  // #125 : « ménages » (au sens économique) donnait des enfants à moto pour la fermeture des réseaux de gaz.
  [/\bfamilles?\b|\benfants?\b/i,["family children","parents with children"]],
  // #125 : « obligation » (légale) donnait la BCE pour les transferts de déchets ; seules les dettes publiques comptent.
  [/\bdettes? publiques?\b|\bobligations? (d.[ée]tat|souveraines?)\b|budget de l.[ée]tat/i,["European Central Bank","European Parliament Brussels"]],
  [/tr[eé]sorerie|b[eé]n[eé]fice|profit|cash/i,["accounting office","business finance"]],
  [/batterie|lithium|cobalt/i,"battery recycling"],
  [/hydrog[eè]ne/i,"hydrogen energy"],
  [/p[eé]trole|gaz naturel/i,"oil platform"],
  [/photovolta[iï]que|solaire/i,"solar panels"],
  // #125 : « vent » sans limite de mot trouvait « souvent » et « peuvent » (éoliennes pour Herstatt et une crise diplomatique).
  [/[eé]olien|\bvents?\b/i,"wind turbines"],
  [/recherche|laboratoire|exp[eé]rience/i,"laboratory"],
  // Realistic visual cues derived from each story, without claiming that a
  // stock photograph depicts the specific events or people in the article.
  [/microprocesseur|semi-conducteur|semiconducteur|processeur|puce [eé]lectronique/i,["semiconductor chip cleanroom","microchip manufacturing"]],
  [/intelligence artificielle|\bIA\b|machine learning/i,["artificial intelligence data center","computer servers"]],
  [/recyclage (des |de )?(m[eé]taux|minerais|mat[eé]riaux critiques)/i,["metal recycling facility","industrial metal recycling"]],
  [/mine|extraction mini[eè]re|minerai|cuivre|mangan[eè]se|bauxite/i,["mining open pit","mineral ore processing"]],
  [/r[eé]seau [eé]lectrique|[eé]lectricit[eé]|mix [eé]nerg[eé]tique/i,["electricity substation","power grid"]],
  [/banques? centrales?|taux d.int[eé]r[eê]t|inflation/i,["central bank building","financial district"]],
  [/emploi|ch[oô]mage|recrutement/i,["workplace employees","industrial workers"]],
  [/porte.conteneurs|transport maritime|d[eé]troit maritime|commerce mondial/i,["container ship port","shipping logistics"]],
  [/robotisation|automatisation|cha[iî]ne de production|usines?/i,["industrial robot assembly line","factory production"]],
  [/d[eé]forestation|reforestation|for[eê]ts tropicales/i,["tropical forest conservation","forest restoration"]],
  [/climat|s[eé]cheresse|inondation/i,["climate monitoring station","flood risk"]],
  [/vaccin|[eé]pid[eé]mie|sant[eé] publique/i,["medical laboratory research","public health research"]],
  [/enseignement|[eé]ducation|[eé]coles|universit[eé]/i,["university students classroom","education classroom"]],
  [/r[eé]union diplomatique|sommet international|n[eé]gociation/i,["diplomatic conference","international delegates meeting"]],
  // Generic terms only after the subject-specific rules above.
  [/for[eê]t|biodiversit[eé]/i,"forest biodiversity"],
  [/puce|semi-conducteur|intelligence artificielle/i,"microchip"]
];
const STOPWORDS=new Set("des les le la l et de du dans en pour par avec une un sur que qui est sont au aux ce ces cette ses entre parmi selon plus moins pourquoi comment leur leurs vous mais sans encore sous vers 2024 2025 2026 ue europa union européen européenne fonctionne fonctionnement quand quoi peut etre veulent dire vraiment faire".split(" "));
/** Broader openly licensed subjects per topic, tried last so that a publication is never left without a photo. */
export const TOPIC_BACKUPS={
  "geopolitique":["parliament building","international conference"],
  "economie":["city business district","shopping street"],
  "finance":["stock exchange","bank building"],
  "industrie":["industrial plant","assembly line workers"],
  "materiaux-critiques":["open pit mine","mineral ore"],
  "energie":["power station","electricity pylons"],
  "recyclage":["recycling plant","waste sorting"],
  "environnement":["nature landscape","river landscape"],
  "technologie":["computer servers","electronics"],
  "entreprises":["office building","business meeting"],
  "afrique":["african market","african landscape"],
  "sciences-societe":["university library","scientists laboratory"]
};
const BAD_TITLES=/\b(logo|icon|coat of arms|emblem|flag|map|chart|diagram|symbol|screenshot|poster|cartoon|drawing|painting|illustration|svg)\b/i;
const ALLOWED_LICENSES=new Map([
  ["cc0","https://creativecommons.org/publicdomain/zero/1.0/"],
  ["cc by 4.0","https://creativecommons.org/licenses/by/4.0/"],
  ["cc by-sa 4.0","https://creativecommons.org/licenses/by-sa/4.0/"],
  ["cc by 3.0","https://creativecommons.org/licenses/by/3.0/"],
  ["cc by-sa 3.0","https://creativecommons.org/licenses/by-sa/3.0/"],
  ["cc by 2.0","https://creativecommons.org/licenses/by/2.0/"],
  ["cc by-sa 2.0","https://creativecommons.org/licenses/by-sa/2.0/"]
]);
/* Coupe par caractères (pas par unités UTF-16) : un demi-emoji rendait le JSON illisible au build. */
const clean=(s,n=160)=>Array.from(String(s??"").replace(/<[^>]*>/g," ").replace(/&(?:nbsp|amp|quot|lt|gt);/gi,m=>({"&nbsp;":" ","&amp;":"&","&quot;":'"',"&lt;":"<","&gt;":">"}[m.toLowerCase()]??m)).replace(/\s+/g," ").trim()).slice(0,n).join("");
/**
 * Recherches d'une publication, avec leur force (#125) :
 * - « forte » : repère visuel précis tiré du TITRE (règles HINTS) ;
 * - « faible » : repère tiré du seul résumé, mots du titre, ou image générique de la rubrique.
 * Une photo trouvée par une recherche faible n'est jamais publiée automatiquement : elle part en
 * révision humaine (rapport), et l'article garde sa couverture typographique. Le 26/11, les dix photos
 * hors sujet signalées venaient toutes de recherches faibles (rubrique, résumé ou mots du titre).
 */
export function queryPlan(article){
  const fromTitle=String(article?.title??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-zA-Z\s-]/g," ").toLowerCase().split(/\s+/).filter(w=>w.length>=4&&!STOPWORDS.has(w)).slice(0,2).join(" ");
  // Prefer the article title; use the summary when a generic title reveals
  // no recognisable visual subject, before trying the general topic fallback.
  const title=String(article?.title??"");
  const summary=String(article?.summary??"").slice(0,300);
  const inTitle=HINTS.find(([pattern])=>pattern.test(title))?.[1];
  const hint=inTitle??HINTS.find(([pattern])=>pattern.test(summary))?.[1];
  const hintStrength=inTitle?"forte":"faible";
  // Specific subjects must NOT fall back to vague "family", "market", or "recycling":
  // those produced lions for human households, a Nepal budget for European public
  // debt, and vandalized bins for textile sorting. Prefer no photo over deception.
  const backups=TOPIC_BACKUPS[article?.topic]??[];
  const plan=[];
  const add=(query,strength)=>{if(query&&!plan.some(x=>x.query===query))plan.push({query,strength});};
  if(Array.isArray(hint)){
    // For a European demographic story, do not silently choose a family in an
    // unrelated region. Require a Europe-specific query and geographic evidence.
    if(hint[0]==="family children"&&/europ|\bUE\b/i.test(title)){
      for(const q of hint)add(q+" Europe",hintStrength);
      return plan;
    }
    // Specific subjects keep their strict cues; only the neutral topic backups follow.
    for(const q of hint)add(q,hintStrength);
    for(const q of backups)add(q,"faible");
    return plan;
  }
  const fallback=PHOTO_QUERIES[article?.topic]??"documentary";
  add(hint,hintStrength);
  if(fromTitle.length>=5)add(fromTitle,"faible");
  add(fallback,"faible");
  for(const q of backups)add(q,"faible");
  return plan;
}
export function imageQueries(article){return queryPlan(article).map(x=>x.query);}
/** Années à quatre chiffres (1800-2099) citées dans un texte. */
const yearsIn=s=>[...String(s??"").matchAll(/\b(1[89]\d{2}|20\d{2})\b/g)].map(m=>Number(m[1]));
/**
 * Contrôle propre à l'article (#125), en plus des licences : une photo datée d'une autre époque
 * qu'un récit (Carl Lewis à Helsinki en 1983 pour l'Acte final de 1975) est refusée, comme une photo
 * déjà écartée par la rédaction pour cet article ou un autre (content/editorial-image-reviews.json).
 */
export function rejectsForArticle(article,candidate,{rejected=new Set()}={}){
  if(rejected.has(candidate?.url))return "photo écartée par la rédaction";
  const own=yearsIn(article?.title);
  const pictured=yearsIn(candidate?.title);
  if(own.length&&pictured.length&&!pictured.some(y=>own.some(x=>Math.abs(x-y)<=2)))
    return "époque différente ("+pictured.join(", ")+" pour un sujet de "+own.join(", ")+")";
  return null;
}
/** Révisions de la rédaction (#125) : photos conservées, retirées (couverture typographique) ou approuvées. */
export const REVIEWS="content/editorial-image-reviews.json";
export function loadReviews(root=process.cwd()){
  const path=resolve(root,REVIEWS);
  if(!existsSync(path))return {items:[]};
  const data=JSON.parse(readFileSync(path,"utf8"));
  return {...data,items:Array.isArray(data?.items)?data.items:[]};
}
function validCommonsFileURL(raw){
  try{
    const u=new URL(raw);
    return u.protocol==="https:"&&["upload.wikimedia.org","thumb.wikimedia.org"].includes(u.hostname)&&!u.username&&!u.password;
  }catch{return false;}
}
function validLicenseURL(raw,canonical){
  // Wikimedia Commons exposes legal Creative Commons URLs both as HTTP and HTTPS,
  // with or without trailing slash, sometimes as /deed.en. Canonicalise the link
  // without weakening license type or allowed host checks.
  const source=String(raw??"").trim();
  const normalized=source.startsWith("//")?"https:"+source:source.replace(/^http:/i,"https:");
  try{
    const u=new URL(normalized),expected=new URL(canonical);
    if(u.protocol!=="https:"||u.hostname!=="creativecommons.org"||
      u.username||u.password||u.port)return false;
    const actual=u.pathname.replace(/\/+$/,""),base=expected.pathname.replace(/\/+$/,"");
    return actual===base||actual.startsWith(base+"/deed");
  }catch{return false;}
}
/** Mots d'une recherche de photo de carte qui doivent tous figurer dans le titre ou la description de l'image. */
const CARD_STOP=new Set("a an the of in on and or with for at by from to".split(" "));
export const cardTerms=q=>String(q).toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>=3&&!CARD_STOP.has(w));
/**
 * exclude : liens d'origine déjà utilisés (photo de l'article, autres cartes, autres articles) ;
 * strict : photo d'une carte, TOUS les mots de la recherche doivent figurer dans le titre ou la
 * description de l'image, et au moins un dans son titre (mieux vaut une carte sans photo qu'une photo hors sujet).
 */
export function selectImage(pages,query,{exclude=new Set(),strict=false}={}){
  const values=Object.values(pages??{});
  const candidates=[];
  for(const page of values){
    const info=page?.imageinfo?.[0];if(!info)continue;
    const ext=info?.extmetadata??{};
    const license=clean(ext.LicenseShortName?.value,45).toLowerCase();
    const licenseUrl=clean(ext.LicenseUrl?.value,250);
    const expected=ALLOWED_LICENSES.get(license);
    if(!expected||!validLicenseURL(licenseUrl,expected))continue;
    const artist=clean(ext.Attribution?.value||ext.Artist?.value,140);
    if(!artist)continue;
    if(!["image/jpeg","image/png","image/webp"].includes(info.mime))continue;
    if(!validCommonsFileURL(info.thumburl))continue;
    const imageTitle=clean(page.title,160).replace(/^File:/i,"");
    if(BAD_TITLES.test(imageTitle))continue;
    // Safety gate: keyword overlap alone is not sufficient for editorial relevance.
    // The query is an ILLUSTRATION cue, not permission to imply the photographed
    // people, country or event are those covered in the article.
    const q=String(query).toLowerCase();
    const name=imageTitle.toLowerCase();
    if(/textile recycling|clothing recycling/.test(q)){
      if(!/textile|clothes|clothing|garment|fabric/.test(name))continue;
      if(/vandal|graffiti|damaged|destroyed|broken|dumping/.test(name))continue;
    }
    if(/family children|parents with children/.test(q)){
      if(!/family|parent|child|children|people|household/.test(name))continue;
      if(/lion|tiger|cat|dog|wolf|elephant|monkey|bear|animal|gorilla|leopard|cheetah|panda|zebra|horse|hippo/.test(name))continue;
      if(/\beurope\b/.test(q)){
        // Strong geographic guard: an illustration labelled as European must
        // have some supporting geographic metadata and no conflicting place.
        const geo=(imageTitle+" "+clean(ext.ImageDescription?.value,850)).toLowerCase();
        if(/\b(pune|maharashtra|india|nepal|pakistan|bangladesh|kenya|nigeria|china|japan|usa|united states|australia|brazil)\b/.test(geo))continue;
        if(!/\b(europe\w*|europ\w*|france|germany|german|spain|spanish|italy|italian|netherlands|belgium|poland|sweden|czech|austria|portugal|romania|finland|denmark)\b/.test(geo))continue;
      }
    }
    if(/european central bank|european parliament brussels/.test(q)){
      if(!/europe|europ|brussels|bruxelles|euro|central bank|parliament|ecb/.test(name))continue;
      if(/nepal|nepali|india|china|japan|russia|pakistan/.test(name))continue;
    }
    if(/accounting office|business finance/.test(q)){
      if(!/account|office|finance|business|workplace/.test(name))continue;
    }
    if((info.width??0)<700||(info.height??0)<400)continue;
    const url="https://commons.wikimedia.org/wiki/"+encodeURIComponent(String(page.title).replace(/ /g,"_"));
    if(exclude.has(url))continue;
    const terms=String(query).toLowerCase().split(/\W+/).filter(w=>w.length>=5);
    const description=clean(ext.ImageDescription?.value,850).toLowerCase();
    const relevant=(imageTitle+" "+description).toLowerCase();
    const match=terms.filter(word=>relevant.includes(word)).length;
    if(strict){
      const words=cardTerms(query),inTitle=imageTitle.toLowerCase();
      if(!words.length||!words.every(w=>relevant.includes(w))||!words.some(w=>inTitle.includes(w)))continue;
    }
    // The Wikimedia search relevance alone does not prove exact-event identity.
    candidates.push({match,url,src:info.thumburl,
      title:imageTitle,author:artist,license:clean(ext.LicenseShortName?.value,45),
      licenseUrl:expected,width:info.thumbwidth??info.width,height:info.thumbheight??info.height});
  }
  candidates.sort((a,b)=>b.match-a.match);
  return candidates.find(x=>strict||x.match>=1)??null;
}
export async function searchCommons(query,fetcher=fetch,options={}){
  const url=new URL("https://commons.wikimedia.org/w/api.php");
  for(const [k,v] of Object.entries({action:"query",generator:"search",gsrsearch:query,
    gsrnamespace:"6",gsrlimit:options.strict?"40":"18",prop:"imageinfo",iiprop:"url|mime|size|extmetadata",
    iiurlwidth:"1280",format:"json",formatversion:"2"}))url.searchParams.set(k,v);
  const reply=await fetcher(url.toString(),{headers:{"User-Agent":"MUNDI/1.0 (https://mundiapptest.netlify.app; editorial image selection)","Accept":"application/json"},signal:AbortSignal.timeout(20000)});
  if(!reply.ok)throw new Error("Wikimedia Commons HTTP "+reply.status);
  const data=await reply.json();
  const found=selectImage(data?.query?.pages,query,options);
  if(!found){
    const pages=Object.values(data?.query?.pages??{});
    const examples=pages.slice(0,3).map(page=>({
      title:String(page?.title??"").slice(0,55),
      license:String(page?.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value??"none").slice(0,35),
      mime:String(page?.imageinfo?.[0]?.mime??"none").slice(0,35),
      thumb:Boolean(page?.imageinfo?.[0]?.thumburl),
      author:Boolean(page?.imageinfo?.[0]?.extmetadata?.Artist?.value),
      licenseUrl:String(page?.imageinfo?.[0]?.extmetadata?.LicenseUrl?.value??"none").slice(0,110),
      width:page?.imageinfo?.[0]?.width,height:page?.imageinfo?.[0]?.height,
      thumbHost:(()=>{try{return new URL(page?.imageinfo?.[0]?.thumburl).hostname}catch{return"none"}})()
    }));
    console.log("MUNDI Wikimedia query diagnostic:",JSON.stringify({query,pages:pages.length,examples}));
  }
  return found;
}
/** Un fichier précis de Commons, approuvé par la rédaction (« File:… ») : mêmes contrôles de licence et de format. */
export async function fetchCommonsFile(file,fetcher=fetch){
  const url=new URL("https://commons.wikimedia.org/w/api.php");
  for(const [k,v] of Object.entries({action:"query",titles:file,prop:"imageinfo",iiprop:"url|mime|size|extmetadata",
    iiurlwidth:"1280",format:"json",formatversion:"2"}))url.searchParams.set(k,v);
  const reply=await fetcher(url.toString(),{headers:{"User-Agent":"MUNDI/1.0 (https://mundiapptest.netlify.app; editorial image selection)","Accept":"application/json"},signal:AbortSignal.timeout(20000)});
  if(!reply.ok)throw new Error("Wikimedia Commons HTTP "+reply.status);
  const data=await reply.json();
  return selectImage(data?.query?.pages,String(file).replace(/^File:/i,"").replace(/\.[a-z]+$/i,""),{strict:false});
}
export async function downloadPhoto(candidate,fetcher=fetch){
  if(!validCommonsFileURL(candidate.src))throw new Error("Image host is not an official Wikimedia thumbnail CDN");
  const res=await fetcher(candidate.src,{headers:{"User-Agent":"MUNDI/1.0 (https://mundiapptest.netlify.app)"},
    redirect:"error",signal:AbortSignal.timeout(25000)});
  if(!res.ok)throw new Error("Image download HTTP "+res.status);
  const type=(res.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[type];
  if(!ext)throw new Error("Unexpected image MIME: "+type);
  if(Number(res.headers.get("content-length")||0)>2_500_000)throw new Error("Image too large");
  const buffer=Buffer.from(await res.arrayBuffer());
  if(buffer.length<4_000||buffer.length>2_500_000)throw new Error("Invalid photo size");
  const signature=ext==="jpg"?buffer[0]===0xff&&buffer[1]===0xd8:
    ext==="png"?buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
      buffer.subarray(0,4).toString()==="RIFF"&&buffer.subarray(8,12).toString()==="WEBP";
  if(!signature)throw new Error("Image MIME/signature mismatch");
  return {ext,buffer};
}
export async function collectEditorialImages(articles,existing=[],{
  search=searchCommons,download=downloadPhoto,max=8,root=process.cwd(),
  day=new Date().toISOString().slice(0,10),reviews=loadReviews(root),fetchFile=fetchCommonsFile
}={}){
  // Up to 48 publications a day (two editions): one run must be able to cover a whole day.
  const limit=Math.max(0,Math.min(60,Number(max)||0));
  const known=new Set(existing.map(p=>p.slug));
  const out=[...existing],report=[];
  const review=new Map((reviews?.items??[]).map(x=>[x.slug,x]));
  const rejected=new Set((reviews?.items??[]).flatMap(x=>(x.rejected??[]).map(r=>r.sourceUrl)));
  for(const p of articles.filter(x=>x?.status==="published")){
    if(known.has(p.slug)||report.filter(x=>x.status==="added").length>=limit)continue;
    // Retirée par la rédaction : couverture typographique jusqu'à ce qu'une personne approuve une photo.
    if(review.get(p.slug)?.status==="retiree"){report.push({slug:p.slug,status:"typographic_by_review"});continue;}
    let selected=null,lastError="",pending=null;
    // Photo approuvée par une personne (nom exact du fichier sur Commons) : seule cette photo est acceptée.
    const approved=review.get(p.slug);
    if(approved?.status==="approuvee"&&typeof approved.file==="string"){
      try{
        const candidate=await fetchFile(approved.file);
        if(!candidate)throw new Error("fichier approuvé introuvable ou licence refusée");
        const file=await download(candidate);
        const local="/media/editorial/"+p.slug+"."+file.ext;
        const path=resolve(root,"public"+local);
        mkdirSync(dirname(path),{recursive:true});
        writeFileSync(path,file.buffer);
        out.push({slug:p.slug,src:local,alt:typeof approved.alt==="string"&&approved.alt.length>=10?approved.alt:"Photographie d'illustration : "+candidate.title,
          title:candidate.title,credit:candidate.author,license:candidate.license,licenseUrl:candidate.licenseUrl,sourceUrl:candidate.url,
          kind:"illustration",review:"automated-license-and-title-check",retrievedAt:day,searchQuery:"approuvée : "+approved.file});
        known.add(p.slug);report.push({slug:p.slug,status:"added",query:"approved file"});
      }catch(error){report.push({slug:p.slug,status:"approved_file_failed",error:String(error?.message||error).slice(0,120)});}
      continue;
    }
    for(const {query,strength} of queryPlan(p)){
      try{
        // Jamais deux fois la même photo : le 25/11, un même laboratoire illustrait quatre articles
        // et une même boîte de piles le cobalt congolais comme la guerre du Shaba.
        const candidate=await search(query,undefined,{exclude:new Set([...out.map(x=>x.sourceUrl),...rejected])});
        if(!candidate)continue;
        const refusal=rejectsForArticle(p,candidate,{rejected});
        if(refusal){lastError=refusal;continue;}
        // Recherche faible (rubrique, résumé, mots du titre) : proposée à la rédaction, jamais publiée seule.
        if(strength!=="forte"){
          pending??={query,title:candidate.title,sourceUrl:candidate.url,credit:candidate.author,license:candidate.license};
          continue;
        }
        const file=await download(candidate);
        const local="/media/editorial/"+p.slug+"."+file.ext;
        const path=resolve(root,"public"+local);
        mkdirSync(dirname(path),{recursive:true});
        if(!existsSync(path))writeFileSync(path,file.buffer);
        selected={
          slug:p.slug,src:local,alt:"Photographie d'illustration : "+candidate.title,
          title:candidate.title,credit:candidate.author,license:candidate.license,
          licenseUrl:candidate.licenseUrl,sourceUrl:candidate.url,
          kind:"illustration",review:"automated-license-and-title-check",
          retrievedAt:day,searchQuery:query
        };
        break;
      }catch(error){lastError=String(error?.message||error).slice(0,120);}
    }
    if(selected){out.push(selected);known.add(p.slug);report.push({slug:p.slug,status:"added",query:selected.searchQuery});}
    else if(pending)report.push({slug:p.slug,status:"needs_human_review",candidate:pending});
    else report.push({slug:p.slug,status:"no_licensed_photo",error:lastError});
  }
  return collectCardPhotos(articles,out,report,{search,download,limit,root,day,review,rejected});
}
/** Slug (et nom de fichier) de la photo propre à une carte « Données ». */
export const cardPhotoSlug=(publication,card)=>(publication+"-carte-"+card).replace(/-+/g,"-").replace(/^-|-$/g,"");
/**
 * Photos des cartes « Données » montrées dans le fil : une photo par carte, chacune différente de la
 * photo de l'article, des autres cartes et de toutes les photos déjà au catalogue. Chaque carte porte sa
 * propre recherche (imageQuery). Rien de trouvé : la carte reste en texte, jamais la photo de l'article.
 * Les photos de cartes retirées du fil sont enlevées du catalogue.
 */
async function collectCardPhotos(articles,images,report,{search,download,limit,root,day,review=new Map(),rejected=new Set()}){
  const shown=new Map();
  for(const p of articles)if(p?.status==="published"&&p.dataCardsInFeed!==false)
    for(const c of p.dataCards??[])shown.set(cardPhotoSlug(p.slug,c.id),{p,c});
  const out=images.filter(x=>!x.card||shown.has(x.slug));
  for(const x of images)if(x.card&&!shown.has(x.slug)){
    const path=resolve(root,"public"+x.src);
    if(existsSync(path))rmSync(path);
    report.push({slug:x.slug,status:"card_photo_removed"});
  }
  const known=new Set(out.map(x=>x.slug));
  for(const [slug,{p,c}] of shown){
    if(known.has(slug)||typeof c.imageQuery!=="string"||!c.imageQuery.trim())continue;
    if(review.get(slug)?.status==="retiree"){report.push({slug,status:"typographic_by_review"});continue;}
    if(report.filter(x=>x.status==="added").length>=limit)break;
    const query=c.imageQuery.trim();
    try{
      const candidate=await search(query,undefined,{exclude:new Set([...out.map(x=>x.sourceUrl),...rejected]),strict:true});
      if(!candidate){report.push({slug,status:"no_card_photo",query});continue;}
      const refusal=rejectsForArticle(p,candidate,{rejected});
      if(refusal){report.push({slug,status:"no_card_photo",query,error:refusal});continue;}
      const file=await download(candidate);
      const local="/media/editorial/"+slug+"."+file.ext;
      const path=resolve(root,"public"+local);
      mkdirSync(dirname(path),{recursive:true});
      writeFileSync(path,file.buffer);
      out.push({slug,src:local,alt:"Photographie d'illustration : "+candidate.title,
        title:candidate.title,credit:candidate.author,license:candidate.license,
        licenseUrl:candidate.licenseUrl,sourceUrl:candidate.url,
        kind:"illustration",review:"automated-license-and-title-check",
        retrievedAt:day,searchQuery:query,publication:p.slug,card:c.id});
      known.add(slug);
      report.push({slug,status:"added",query});
    }catch(error){report.push({slug,status:"no_card_photo",query,error:String(error?.message||error).slice(0,120)});}
  }
  return {images:out,report};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const items=JSON.parse(readFileSync("content/publications.json","utf8"));
  const existing=JSON.parse(readFileSync(MEDIA_CATALOG,"utf8"));
  const result=await collectEditorialImages(items,existing,{max:process.env.MUNDI_IMAGES_MAX??60});
  writeFileSync(MEDIA_CATALOG,JSON.stringify(result.images,null,2)+"\n");
  mkdirSync("reports",{recursive:true});
  writeFileSync("reports/editorial-images.json",JSON.stringify(result.report,null,2)+"\n");
  for(const entry of result.report)console.log("MUNDI photo",entry.slug,entry.status,entry.error??"");
  console.log("MUNDI photographs:",result.report.filter(r=>r.status==="added").length,"new,",result.images.length,"total;");
}
