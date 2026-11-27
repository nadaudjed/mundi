import test from "node:test";
import assert from "node:assert/strict";
import {imageQueries,selectImage,searchCommons,downloadPhoto,collectEditorialImages} from "../scripts/collect-editorial-images.mjs";
function candidate(title="File:Textile recycling facility.jpg",license="CC BY 4.0",url="https://creativecommons.org/licenses/by/4.0/"){
  return {title,imageinfo:[{mime:"image/jpeg",thumburl:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/test.jpg/1400px-test.jpg",
    width:1600,height:1000,thumbwidth:1400,thumbheight:875,extmetadata:{
    LicenseShortName:{value:license},LicenseUrl:{value:url},Artist:{value:"<a href='https://commons.wikimedia.org'>Photo &amp; Artist</a>"}}}]};
}
test("image search queries use the article first, then a distinct photographic topic fallback",()=>{
 const q=imageQueries({title:"Déchets textiles : comment ils sont recyclés en Europe",topic:"recyclage"});
 assert.deepEqual(q,["textile recycling sorting","clothing recycling","recycling plant","waste sorting"]);
 assert.deepEqual(imageQueries({title:"!!!",topic:"afrique"}),["african city","african market","african landscape"]);
});
test("Commons selector accepts credited CC BY photo and strips HTML safely",()=>{
 const pic=selectImage([candidate()],"textile recycling");
 assert.equal(pic.license,"CC BY 4.0");
 assert.equal(pic.author,"Photo & Artist");
 assert.match(pic.url,/commons.wikimedia.org/);
});
test("reject all pictures with unknown rights, unauthenticated authors, or unsupported format",()=>{
 const badLicense=candidate("File:Textile recycling.jpg","Copyrighted","https://example.org/terms");
 const missing=candidate();delete missing.imageinfo[0].extmetadata.Artist;
 const external=candidate();external.imageinfo[0].thumburl="https://evil.example/picture.jpg";
 const diagram=candidate("File:Textile recycling diagram.jpg");
 assert.equal(selectImage([badLicense,missing,external,diagram],"textile recycling"),null);
});
test("search URL includes category and imageinfo rights, and never exposes an API key",async()=>{
 let uri;
 const out=await searchCommons("textile recycling",async (url,options)=>{
   uri=new URL(url);assert.equal(options.headers.Accept,"application/json");
   return {ok:true,json:async()=>({query:{pages:[candidate()]}})};
 });
 assert.equal(uri.host,"commons.wikimedia.org");
 assert.equal(uri.searchParams.get("gsrsearch"),"textile recycling");
 assert.match(uri.searchParams.get("iiprop"),/extmetadata/);
 assert.ok(out);
});
test("reject unsafe image download URL before sending any network request",async()=>{
 await assert.rejects(downloadPhoto({src:"https://evil.example/unsafe.jpg"},()=>{throw new Error("SHOULD NOT CALL")}),/Wikimedia thumbnail CDN/);
});
test("each approved candidate becomes a local image and an attributed manifest entry",async()=>{
 const fs=await import("node:fs"),os=await import("node:os"),path=await import("node:path");
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"mundi-photos-"));
 try{
   const fake=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(5000)]);
   const result=await collectEditorialImages([{status:"published",slug:"article-test",title:"Ariane 6 : la fusée européenne décolle",topic:"technologie"}],[],{
     root,max:1,search:async()=>({...selectImage([candidate()],"textile recycling"),title:"Textile facility"}),
     download:async()=>({ext:"jpg",buffer:fake}),day:"2026-11-23"
   });
   assert.equal(result.images.length,1);
   assert.equal(result.images[0].kind,"illustration");
   assert.equal(result.images[0].review,"automated-license-and-title-check");
   assert.equal(result.images[0].sourceUrl.startsWith("https://commons.wikimedia.org/"),true);
   assert.ok(fs.existsSync(path.join(root,"public/media/editorial/article-test.jpg")));
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test("existing photos are never overwritten and unlicensed results never become public",async()=>{
 const old={slug:"article-a",src:"/media/editorial/article-a.jpg"};
 const result=await collectEditorialImages([
 {status:"published",slug:"article-a",title:"Article A",topic:"finance"},
 {status:"published",slug:"article-b",title:"Article B",topic:"finance"},
 {status:"draft",slug:"article-c",title:"Article C",topic:"finance"}],[old],{
 search:async()=>null,max:8
 });
 assert.deepEqual(result.images,[old]);
 assert.equal(result.report.length,1);
 assert.equal(result.report[0].status,"no_licensed_photo");
});

test("Wikimedia Commons HTTPS and HTTP Creative Commons licence URLs are normalised, not rejected",()=>{
 const pic=candidate("File:Textile recycling factory.jpg","CC BY-SA 3.0","http://creativecommons.org/licenses/by-sa/3.0/");
 pic.imageinfo[0].thumburl="https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/image.jpg/1400px-image.jpg";
 const selected=selectImage([pic],"textile recycling");
 assert.ok(selected);
 assert.equal(selected.licenseUrl,"https://creativecommons.org/licenses/by-sa/3.0/");
 assert.match(selected.src,/^https:\/\/thumb\.wikimedia\.org\//);
 const noSlash=candidate("File:Textile recycling factory.jpg","CC BY-SA 4.0","https://creativecommons.org/licenses/by-sa/4.0");
 assert.ok(selectImage([noSlash],"textile recycling"));
 const deed=candidate("File:Textile recycling factory.jpg","CC0","http://creativecommons.org/publicdomain/zero/1.0/deed.en");
 assert.ok(selectImage([deed],"textile recycling"));
});
test("non-Wikimedia thumbnails and fake Creative Commons hosts stay blocked",()=>{
 const foreign=candidate();foreign.imageinfo[0].thumburl="https://upload.wikimedia.org.evil.example/pic.jpg";
 assert.equal(selectImage([foreign],"textile recycling"),null);
 const fake=candidate("File:Textile recycling factory.jpg","CC BY 4.0","https://creativecommons.org.evil.example/licenses/by/4.0/");
 assert.equal(selectImage([fake],"textile recycling"),null);
});

test("editorial image search never falls back to animals, unrelated national budgets or vandalized containers",()=>{
  assert.deepEqual(imageQueries({title:"Ménages avec enfants en Europe",topic:"economie"}),["family children Europe","parents with children Europe"]);
  assert.deepEqual(imageQueries({title:"Dette publique de l'Union européenne",topic:"economie"}),["European Central Bank","European Parliament Brussels","city business district","shopping street"]);
  assert.equal(selectImage([candidate("File:Lions Family Portrait Masai Mara.jpg")],"family children"),null);
  assert.equal(selectImage([candidate("File:Budget of Nepal 2007.jpg")],"European Central Bank"),null);
  assert.equal(selectImage([candidate("File:Textile recycling bin vandalism.jpg")],"textile recycling sorting"),null);
});
test("clear visually relevant documentary examples still qualify with attribution",()=>{
  const sorting=candidate("File:Textile recycling sorting plant workers.jpg");
  assert.equal(selectImage([sorting],"textile recycling sorting").title,"Textile recycling sorting plant workers.jpg");
  const finance=candidate("File:European Central Bank office in Frankfurt.jpg");
  assert.equal(selectImage([finance],"European Central Bank").title,"European Central Bank office in Frankfurt.jpg");
  const family=candidate("File:Family with children walking in park.jpg");
  assert.equal(selectImage([family],"family children").title,"Family with children walking in park.jpg");
});

test("journalists and professors get precise photo queries from each researched subject",()=>{
 const cases=[
  [{title:"Microprocesseurs et semi-conducteurs : le défi de nouvelles usines",topic:"technologie"},"semiconductor chip cleanroom"],
  [{title:"Les mines de cuivre et la chaîne des matières critiques",topic:"materiaux-critiques"},"mining open pit"],
  [{title:"Réseau électrique : comment équilibrer l'offre et la demande",topic:"energie"},"electricity substation"],
  [{title:"Recyclage des métaux et matières critiques en Europe",topic:"recyclage"},"metal recycling facility"],
  [{title:"Les banques centrales modifient leurs taux d'intérêt",topic:"finance"},"central bank building"],
  [{title:"La déforestation et l'état des forêts tropicales",topic:"environnement"},"tropical forest conservation"],
  [{title:"Les portes-conteneurs et les détroits du commerce mondial",topic:"geopolitique"},"container ship port"],
  [{title:"La robotisation des usines et le travail industriel",topic:"industrie"},"industrial robot assembly line"],
  [{title:"L'éducation et les écoles primaires",topic:"sciences-societe"},"university students classroom"]
 ];
 for(const [article,expected] of cases)assert.equal(imageQueries(article)[0],expected,article.title);
});
test("specific summary information beats the generic topic scene",()=>{
 const q=imageQueries({title:"Ce qui change aujourd'hui",summary:"Les mines de cuivre et l'extraction minière évoluent.",topic:"materiaux-critiques"});
 assert.equal(q[0],"mining open pit");
});
test("all 12 editorial subjects retain a non-empty fallback even if no specific photo exists",()=>{
 for(const topic of ["geopolitique","economie","finance","industrie","materiaux-critiques","energie",
    "recyclage","environnement","technologie","entreprises","afrique","sciences-societe"]){
   const queries=imageQueries({title:"Un sujet du jour",topic});
   assert.ok(queries.length>0&&queries.every(q=>typeof q==="string"&&q.length>3),topic);
 }
});

test("European demographic subjects cannot use families photographed outside Europe",()=>{
 const q=imageQueries({title:"Ménages avec enfants dans l'UE : statistiques",topic:"economie"});
 assert.deepEqual(q,["family children Europe","parents with children Europe"]);
 assert.equal(selectImage([candidate("File:Pune Maharashtra India Family Mothers Children.jpg")],q[0]),null);
 assert.equal(selectImage([candidate("File:Family and children in India.jpg")],q[0]),null);
 const regional=candidate("File:Family with children in France.jpg");
 assert.equal(selectImage([regional],q[0]).title,"Family with children in France.jpg");
 // Generic global subject can still illustrate any country, with an illustration label.
 assert.ok(selectImage([candidate("File:Family and children in India.jpg")],"family children"));
});

test("un appel d'offres public reçoit des requêtes parlantes, puis des sujets neutres de sa rubrique", () => {
  const q=imageQueries({title:"Comment fonctionne un appel d'offres public, du besoin au contrat ?",topic:"industrie"});
  assert.deepEqual(q,["public procurement","government contract signing","industrial plant","assembly line workers"]);
});

test("une journée complète (48 publications) est couverte en un seul passage", async () => {
  const articles=Array.from({length:48},(_,i)=>({status:"published",slug:"article-"+i,title:"Ariane 6 : la fusée européenne décolle "+i,topic:"technologie"}));
  const fs=await import("node:fs"),os=await import("node:os"),path=await import("node:path");
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"mundi-48-"));
  const result=await collectEditorialImages(articles,[],{root,max:60,
    search:async()=>({...selectImage([candidate()],"textile recycling"),title:"Textile facility"}),
    download:async()=>({ext:"jpg",buffer:Buffer.alloc(5000)})});
  assert.equal(result.report.filter(r=>r.status==="added").length,48);
});

test("cartes « Données » : une photo propre à chaque carte, différente de l'article et des autres cartes",async()=>{
 const fs=await import("node:fs"),os=await import("node:os"),path=await import("node:path");
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"mundi-cards-"));
 try{
   const fake=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(5000)]);
   const article={slug:"article-a",src:"/media/editorial/article-a.jpg",sourceUrl:"https://commons.wikimedia.org/wiki/File%3AA.jpg"};
   const pool=["File:A.jpg","File:Gas meter in a house.jpg","File:Gas meter close-up.jpg"].map(t=>candidate(t));
   const calls=[];
   const search=async(query,_f,options={})=>{calls.push({query,options});return selectImage(pool,query,options);};
   const pubs=[
     {status:"published",slug:"article-a",title:"Gaz",topic:"energie",dataCards:[{id:"c1",imageQuery:"gas meter"},{id:"c2",imageQuery:"gas meter"},{id:"c3"}]},
     {status:"published",slug:"article-b",title:"Autre",topic:"energie",dataCardsInFeed:false,dataCards:[{id:"x1",imageQuery:"gas meter"}]}];
   const r=await collectEditorialImages(pubs,[article],{root,max:8,search,download:async()=>({ext:"jpg",buffer:fake}),day:"2026-11-24"});
   const cards=r.images.filter(x=>x.card);
   assert.deepEqual(cards.map(x=>[x.publication,x.card,x.slug]),[["article-a","c1","article-a-carte-c1"],["article-a","c2","article-a-carte-c2"]]);
   assert.equal(new Set([article.sourceUrl,...cards.map(x=>x.sourceUrl)]).size,3,"trois photos différentes");
   assert.ok(calls.filter(c=>c.query==="gas meter").every(c=>c.options.strict),"recherche stricte pour les cartes");
   assert.ok(!r.images.some(x=>x.publication==="article-b"),"pas de photo pour un article qui n'est pas en cartes");
   // Carte retirée du fil : sa photo quitte le catalogue.
   const again=await collectEditorialImages([{...pubs[0],dataCardsInFeed:false}],r.images,{root,max:8,search,download:async()=>({ext:"jpg",buffer:fake})});
   assert.equal(again.images.filter(x=>x.card).length,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test("photo de carte : tous les mots de la recherche doivent figurer, sinon pas de photo",()=>{
 assert.equal(selectImage([candidate("File:Gas station at night.jpg")],"gas meter",{strict:true}),null);
 assert.ok(selectImage([candidate("File:Old gas meter.jpg")],"gas meter",{strict:true}));
 const used=new Set(["https://commons.wikimedia.org/wiki/File%3AOld_gas_meter.jpg"]);
 assert.equal(selectImage([candidate("File:Old gas meter.jpg")],"gas meter",{strict:true,exclude:used}),null);
});
test("credit cut never splits an emoji (half-emoji broke the site build)",()=>{
 const c=candidate();c.imageinfo[0].extmetadata.Artist={value:"A".repeat(139)+"😀 suite"};
 const pic=selectImage([c],"textile recycling");
 assert.ok(pic);
 assert.doesNotMatch(JSON.stringify(pic),/\\ud[89ab][0-9a-f]{2}(?!\\ud[c-f])/i);
 assert.doesNotMatch(JSON.stringify(pic).normalize(),/[\ud800-\udbff](?![\udc00-\udfff])/);
});
test("editorial image catalog contains no broken (lone surrogate) character",async()=>{
 const {readFileSync}=await import("node:fs");
 const raw=readFileSync("content/editorial-images.json","utf8");
 assert.doesNotMatch(raw,/\\ud[89ab][0-9a-f]{2}(?!\\ud[c-f][0-9a-f]{2})/i);
 assert.doesNotMatch(raw,/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/);
});
test("sujets du 25/11 : des repères visuels précis au lieu d'un jeu de plateau ou d'une statue", () => {
  const first=(title,topic)=>imageQueries({title,topic})[0];
  assert.equal(first("Gaza : la Commission dénonce l'accès bloqué à l'aide, 150 000 tentes attendent dehors","geopolitique"),"humanitarian aid trucks");
  assert.equal(first("Premier froid de l'hiver : chaque degré perdu ajoute 2 300 MW de demande électrique","energie"),"electricity pylons winter");
  assert.equal(first("Cancer du sein : le Royaume-Uni lance le plus grand essai de dépistage assisté par IA","technologie"),"mammography");
  assert.equal(first("Logement : l'investissement des ménages de l'UE tombe à 8,1 %, au plus bas depuis 2015","economie"),"housing construction");
  assert.equal(first("Libye : l’ONU réclame une enquête après la destruction d’un navire russe à Benghazi","afrique"),"naval ship harbour");
  assert.equal(first("Impôts non collectés : l'UE perd plus de 200 milliards d'euros par an, selon Bruxelles","finance"),"European Commission Berlaymont");
  assert.ok(imageQueries({title:"!!!",topic:"geopolitique"}).includes("diplomatic conference"));
});
test("une même photo n'illustre jamais deux articles : la recherche exclut les photos déjà au catalogue", async () => {
  const fs=await import("node:fs"),os=await import("node:os"),path=await import("node:path");
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"mundi-dedup-"));
  const lab=selectImage([candidate("File:Biochemistry laboratory panorama.jpg")],"laboratory");
  const existing=[{slug:"guimaraes",sourceUrl:lab.url}];
  const seen=[];
  const result=await collectEditorialImages([{status:"published",slug:"variole",title:"Recherche en laboratoire",topic:"sciences-societe"}],existing,{root,
    search:async(query,_f,options)=>{seen.push(options?.exclude);return selectImage([candidate("File:Biochemistry laboratory panorama.jpg")],query,options);},
    download:async()=>({ext:"jpg",buffer:Buffer.alloc(5000)})});
  assert.ok(seen.every(x=>x instanceof Set&&x.has(lab.url)));
  assert.equal(result.images.filter(x=>x.sourceUrl===lab.url).length,1);
  assert.equal(result.report[0].status,"no_licensed_photo");
});

/* #125 — non-régression sur les mauvaises associations du 26/11/2026. */
import {queryPlan,rejectsForArticle,loadReviews} from "../scripts/collect-editorial-images.mjs";
import {readFileSync as readJson26} from "node:fs";
const catalogue26=JSON.parse(readJson26("content/publications.json","utf8"));
const article26=prefix=>{const p=catalogue26.find(x=>x.slug.startsWith(prefix));assert.ok(p,"article introuvable : "+prefix);return p;};
const BAD_26=[
  ["spoutnik-1957","laboratory"],["helsinki-1er-aout","helsinki aout"],["herstatt-26-juin","wind turbines"],
  ["mobro-4000","Ariane 5 rocket"],["addis-abeba-mai-1963","humanitarian aid distribution"],["sortie-du-gaz","family children"],
  ["liberia-5-6-milliards","african city"],["comment-fonctionne-une-franchise","franchise marque"],
  ["comment-nait-et-s-aggrave","wind turbines"],["transferts-de-dechets","European Central Bank"],
];
test("#125 : les dix photos hors sujet signalées ne peuvent plus être publiées automatiquement",()=>{
  for(const [prefix,query] of BAD_26){
    const plan=queryPlan(article26(prefix));
    const step=plan.find(x=>x.query===query);
    // Soit la recherche fautive a disparu, soit elle n'est plus qu'une proposition soumise à la rédaction.
    assert.ok(!step||step.strength==="faible",prefix+" : « "+query+" » ne doit plus être une recherche forte");
  }
});
test("#125 : « souvent », « refusée », « ménages » et une obligation légale ne déclenchent plus éoliennes, fusée, enfants ou BCE",()=>{
  const strong=(title,summary="")=>queryPlan({title,summary,topic:"finance"}).filter(x=>x.strength==="forte").map(x=>x.query);
  assert.deepEqual(strong("Une faillite qui arrive souvent"),[]);
  assert.deepEqual(strong("Une barge refusée dans tous les ports"),[]);
  assert.deepEqual(strong("Fermer les réseaux de gaz : ce qui change pour les ménages"),[]);
  assert.deepEqual(strong("L'UE repousse l'obligation du traçage des déchets"),[]);
  // « wind turbines » reste une recherche, mais de rubrique : jamais publiée seule (#125, commentaire de suivi).
  assert.ok(queryPlan({title:"Les éoliennes en mer produisent plus",topic:"energie"}).some(x=>x.query==="wind turbines"));
  assert.deepEqual(strong("Les éoliennes en mer produisent plus"),[]);
  assert.ok(strong("Ariane 6 : la fusée européenne décolle").includes("Ariane 5 rocket"));
});
test("#125 : seule une recherche précise tirée du titre publie une photo ; le reste part en révision humaine",async()=>{
  const fs=await import("node:fs"),os=await import("node:os"),path=await import("node:path");
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"mundi-125-"));
  try{
    const result=await collectEditorialImages([article26("liberia-5-6-milliards")],[],{root,reviews:{items:[]},
      search:async(q)=>({...selectImage([candidate("File:African Quarter, Djibouti city.jpg")],"african city"),title:"African Quarter, Djibouti city.jpg"}),
      download:async()=>({ext:"jpg",buffer:Buffer.alloc(5000)})});
    assert.equal(result.images.length,0);
    assert.equal(result.report[0].status,"needs_human_review");
    assert.match(result.report[0].candidate.title,/Djibouti/);
  }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test("#125 : une photo d'une autre époque qu'un récit daté est refusée (Carl Lewis 1983 pour Helsinki 1975)",()=>{
  const p=article26("helsinki-1er-aout");
  assert.match(rejectsForArticle(p,{title:"Carl Lewis Helsinki 1983.jpg",url:"x"}),/époque/);
  assert.equal(rejectsForArticle(p,{title:"Finlandia Hall Helsinki.jpg",url:"y"}),null);
});
test("#125 : un article retiré par la rédaction garde sa couverture typographique, et une photo rejetée n'est plus jamais proposée",async()=>{
  const reviews=loadReviews();
  const retired=reviews.items.filter(x=>x.status==="retiree");
  assert.ok(retired.length>=10);
  // Sans ses cartes « Données » (elles ont leurs propres photos, revues séparément).
  const {dataCards:_cards,...p}=article26("spoutnik-1957");
  let searched=0;
  const result=await collectEditorialImages([p],[],{reviews,search:async()=>{searched++;return null;},download:async()=>{throw new Error("jamais");}});
  assert.equal(searched,0);
  assert.equal(result.report.find(r=>r.slug===p.slug).status,"typographic_by_review");
  const rejectedUrl=retired.find(x=>x.rejected?.length).rejected[0].sourceUrl;
  const other={status:"published",slug:"autre-article",title:"Le recyclage textile",topic:"recyclage"};
  const seen=[];
  await collectEditorialImages([other],[],{reviews,search:async(q,_f,o)=>{seen.push(o.exclude);return null;},download:async()=>null});
  assert.ok(seen.every(x=>x.has(rejectedUrl)));
});
test("#125 : chaque publication du 26/11 a une décision de la rédaction, et aucune photo retirée ne reste au catalogue",()=>{
  const reviews=loadReviews().items,images=JSON.parse(readJson26("content/editorial-images.json","utf8"));
  const day=catalogue26.filter(p=>p.status==="published"&&p.publishedAt==="2026-11-26");
  for(const p of day){
    const r=reviews.find(x=>x.slug===p.slug);
    assert.ok(r&&["conservee","retiree","approuvee"].includes(r.status)&&r.reason.length>=20,"décision manquante : "+p.slug);
    const photo=images.find(x=>x.slug===p.slug);
    if(r.status==="retiree")assert.equal(photo,undefined,"photo retirée encore publiée : "+p.slug);
    if(r.status==="conservee")assert.ok(photo,"photo conservée absente : "+p.slug);
  }
  const rejected=new Set(reviews.flatMap(x=>(x.rejected??[]).map(y=>y.sourceUrl)));
  assert.equal(images.filter(x=>rejected.has(x.sourceUrl)).length,0);
});
