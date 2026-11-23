import test from "node:test";
import assert from "node:assert/strict";
import { collectFeeds } from "../scripts/collect-sources.mjs";
import { makeReport } from "../scripts/render-editorial-report.mjs";

const source = {
  id:"eurostat-unit", publisher:"Eurostat", topic:"economie",
  feedUrl:"https://ec.europa.eu/eurostat/en/search?p_p_resource_id=atom",
  enabled:true, rightsStatus:"approved_metadata_collection",
  rightsUrl:"https://ec.europa.eu/eurostat/help/copyright-notice"
};
const atom = '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Statistiques officielles à vérifier</title>'+
  '<link rel="alternate" href="https://ec.europa.eu/eurostat/news/test" />'+
  '<updated>2026-11-23T08:00:00Z</updated></entry></feed>';
function response(xml){return {ok:true,headers:{get:()=>null},text:async()=>xml};}

test("a successful authorized Atom source is reported with count", async()=>{
  const out=await collectFeeds([source],async()=>response(atom));
  assert.equal(out.count,1);
  assert.deepEqual(out.sourceHealth,[{sourceId:source.id,publisher:source.publisher,status:"ok",count:1,error:null}]);
  assert.equal(out.errors.length,0);
  const html=makeReport(out);
  assert.match(html,/État des flux institutionnels/);
  assert.match(html,/Eurostat/);
  assert.match(html,/1 article\(s\) candidat\(s\)/);
});

test("a temporarily empty source is not a failure",async()=>{
  const out=await collectFeeds([source],async()=>response('<feed xmlns="http://www.w3.org/2005/Atom"></feed>'));
  assert.equal(out.count,0);
  assert.equal(out.sourceHealth[0].status,"empty");
  assert.equal(out.errors.length,0);
});

test("a failed source keeps a diagnostic and never fabricates candidate news",async()=>{
  const out=await collectFeeds([source],async()=>{throw new Error("503 source inaccessible")});
  assert.equal(out.count,0);
  assert.equal(out.items.length,0);
  assert.equal(out.sourceHealth[0].status,"error");
  assert.match(out.errors[0].error,/503/);
});

test("unapproved enabled sources are refused without any network request",async()=>{
  const denied={...source,rightsStatus:"pending_permission_review",id:"restricted"};
  let calls=0;
  const out=await collectFeeds([denied],async()=>{calls++;return response(atom)});
  assert.equal(calls,0);
  assert.equal(out.count,0);
  assert.equal(out.sourceHealth[0].status,"rights_blocked");
});

test("diagnostic text from a broken publisher is safely escaped in HTML",()=>{
  const html=makeReport({items:[],errors:[],generatedAt:"",sourceHealth:[
    {sourceId:"x",publisher:'<img src=x onerror=alert(1)>',status:"error",count:0,error:"<script>bad</script>"}
  ]});
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(html.includes("&lt;script&gt;bad&lt;/script&gt;"));
  assert.ok(!html.includes("<script>bad</script>"));
});

test("approved ECB feed is on the institutional allowlist and rejects off-domain links",async()=>{
  const ecb={...source,id:"ecb-press",publisher:"Banque centrale européenne",
    feedUrl:"https://www.ecb.europa.eu/rss/press.html",topic:"finance",
    rightsUrl:"https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html"};
  const rss='<rss version="2.0"><channel><item><title>ECB research update</title>'+
    '<link>https://www.ecb.europa.eu/press/pr/date/2026/html/ecb.pr261123.en.html</link>'+
    '<pubDate>Mon, 23 Nov 2026 12:00:00 GMT</pubDate></item>'+
    '<item><title>Other publisher</title><link>https://untrusted.example/foo</link></item>'+
    '</channel></rss>';
  let urls=[];
  const out=await collectFeeds([ecb],async url=>{urls.push(String(url));return response(rss)});
  assert.deepEqual(urls,["https://www.ecb.europa.eu/rss/press.html"]);
  assert.equal(out.count,1);
  assert.equal(out.items[0].publisher,"Banque centrale européenne");
  assert.equal(out.sourceHealth[0].status,"ok");
});

test("Commission RSS feeds on distinct official subdomains collect safe metadata",async()=>{
  for(const [id,feedUrl,link] of [
    ["ec-presscorner","https://ec.europa.eu/commission/presscorner/api/rss","https://ec.europa.eu/commission/presscorner/detail/en/ip_26_9999"],
    ["ec-environment","https://environment.ec.europa.eu/node/92/rss_en","https://environment.ec.europa.eu/news/research-2026-11-23_en"],
    ["ec-jrc","https://joint-research-centre.ec.europa.eu/node/2/rss_en","https://joint-research-centre.ec.europa.eu/jrc-news_en"]
  ]){
    const feed={...source,id,publisher:"Commission européenne",topic:"environnement",feedUrl,
      rightsUrl:"https://commission.europa.eu/legal-notice_en"};
    const xml='<rss version="2.0"><channel><item><title>Source institutionnelle</title>'+
      '<link>'+link+'</link><pubDate>Mon, 23 Nov 2026 12:00:00 GMT</pubDate>'+
      '</item></channel></rss>';
    const out=await collectFeeds([feed],async()=>response(xml));
    assert.equal(out.errors.length,0,id+" accepted");
    assert.equal(out.count,1,id+" collected");
    assert.equal(out.items[0].link,link,id+" source-host linked");
    assert.equal(out.items[0].reviewStatus,"candidate_unverified");
  }
});

test("NASA source host is allowed but an external source cannot hijack RSS links",async()=>{
  const nasa={...source,id:"nasa-news-releases",publisher:"NASA",topic:"sciences-societe",
    feedUrl:"https://www.nasa.gov/news-release/feed/",
    rightsUrl:"https://www.nasa.gov/nasa-brand-center/images-and-media/"};
  const rss='<rss version="2.0"><channel><item><title>NASA Mission</title>'+
    '<link>https://www.nasa.gov/news-release/test-mission/</link></item>'+
    '<item><title>Malicious</title><link>https://foreign.example/malicious</link></item></channel></rss>';
  const out=await collectFeeds([nasa],async()=>response(rss));
  assert.equal(out.errors.length,0);
  assert.equal(out.count,1);
  assert.equal(out.items[0].publisher,"NASA");
  assert.equal(out.items[0].link,"https://www.nasa.gov/news-release/test-mission/");
});
