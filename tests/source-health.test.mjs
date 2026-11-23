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
