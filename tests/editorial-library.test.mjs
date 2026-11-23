import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {accumulateStock,FORMAT} from "../scripts/accumulate-editorial-stock.mjs";
import {measureLibrary,inventoryHtml,TOPICS,LAUNCH_TARGETS} from "../scripts/library-inventory.mjs";

const ideas=JSON.parse(readFileSync("editorial/library/evergreen-ideas.json","utf8"));
const reserve=JSON.parse(readFileSync("editorial/library/approved-reserve.json","utf8"));
const published=JSON.parse(readFileSync("content/publications.json","utf8"));
const sources=JSON.parse(readFileSync("content/sources.json","utf8"));
const NOW="2026-11-23T12:00:00.000Z";
const src=(link,title="Statistiques institutionnelles à analyser")=>({
  title,link,publisher:"Eurostat",sourceId:"eurostat-news",topicHint:"economie",
  rightsUrl:"https://ec.europa.eu/eurostat/help/copyright-notice",
  publishedAt:"2026-11-22T10:00:00Z",reviewStatus:"candidate_unverified"
});
const daily=items=>({generatedAt:NOW,items,errors:[],sourceHealth:[
  {sourceId:"eurostat-news",publisher:"Eurostat",status:"ok",count:items.length}
]});

test("120 distinct evergreen prompts span all twelve MUNDI topics without fabricated article status",()=>{
  assert.equal(ideas.format,"mundi-editorial-ideas-v1");
  assert.equal(ideas.items.length,120);
  assert.equal(new Set(ideas.items.map(i=>i.id)).size,120);
  assert.deepEqual(new Set(ideas.items.map(i=>i.topic)),new Set(TOPICS));
  assert.ok(ideas.items.every(i=>i.status==="idea_unverified"&&
    i.approved===false&&i.factChecked===false&&Array.isArray(i.sources)&&i.sources.length===0));
  assert.deepEqual(reserve.items,[]);
});

test("daily candidate archiving is deduplicated and preserves first discovery time",()=>{
  const a=accumulateStock(null,daily([
    src("https://ec.europa.eu/news/a"),src("https://ec.europa.eu/news/a")
  ]),NOW);
  assert.equal(a.format,FORMAT);
  assert.equal(a.count,1);
  assert.equal(a.latestCollection.newCount,1);
  assert.equal(a.items[0].status,"candidate_unverified");
  const later="2026-11-24T12:00:00Z";
  const b=accumulateStock(a,daily([
    src("https://ec.europa.eu/news/a","Titre mis à jour"),
    src("https://ec.europa.eu/news/b","Nouvelle piste")
  ]),later);
  assert.equal(b.count,2);
  assert.equal(b.latestCollection.newCount,1);
  assert.equal(b.latestCollection.refreshedCount,1);
  assert.equal(b.items.find(i=>i.link.endsWith("/a")).firstSeenAt,NOW);
  assert.equal(b.items.find(i=>i.link.endsWith("/a")).title,"Titre mis à jour");
  assert.equal(b.items.find(i=>i.link.endsWith("/a")).lastSeenAt,"2026-11-24T12:00:00.000Z");
});

test("failed or empty collection does not erase the existing stock",()=>{
  const a=accumulateStock(null,daily([src("https://ec.europa.eu/news/a")]),NOW);
  const b=accumulateStock(a,daily([]),"2026-11-24T12:00:00Z");
  assert.equal(b.count,1);
  assert.equal(b.latestCollection.newCount,0);
  assert.equal(b.items[0].lastSeenAt,NOW);
});

test("candidate archive refuses unsafe claims and URLs",()=>{
  const a=accumulateStock(null,daily([
    src("javascript:alert(1)"),
    {...src("https://ec.europa.eu/news/b"),reviewStatus:"verified"},
    src("https://ec.europa.eu/news/c")
  ]),NOW);
  assert.equal(a.count,1);
  assert.equal(a.latestCollection.invalidCount,2);
  assert.ok(!Object.hasOwn(a.items[0],"reviewedBy"));
  assert.ok(!Object.hasOwn(a.items[0],"sections"));
  assert.ok(!Object.hasOwn(a.items[0],"statusPublished"));
  assert.throws(()=>accumulateStock({format:FORMAT,items:[{link:"http://unsafe.example",status:"published"}]},daily([]),NOW),/invalid entries/);
});

test("the stock window expires items only after 365 days of absence",()=>{
  const a=accumulateStock(null,daily([src("https://ec.europa.eu/news/a")]),NOW);
  const b=accumulateStock(a,daily([]),"2027-11-25T12:00:00Z");
  assert.equal(b.count,0);
});

// The agents now publish automatically: count what content/publications.json really holds.
const live=published.filter(p=>p.status==="published");
test("inventory counts the real publications exactly, zero reserve, and 120 unverified ideas",()=>{
  const inv=measureLibrary({published,ideas,reserve,sources,stock:null,now:NOW});
  assert.ok(live.length>=1);
  assert.equal(inv.current.published,live.length);
  assert.equal(inv.current.approvedReserve,0);
  assert.equal(inv.current.verifiedTotal,live.length);
  assert.equal(inv.current.unverifiedIdeas,120);
  assert.equal(inv.current.unverifiedCandidates,null);
  assert.equal(inv.current.candidateArchiveAvailable,false);
  assert.equal(inv.current.coveredTopics,new Set(live.map(p=>p.topic)).size);
  assert.equal(inv.launchReady,false);
  assert.ok(Object.values(inv.checks).some(v=>!v));
  assert.equal(inv.targets.verifiedTotal,LAUNCH_TARGETS.verifiedTotal);
  assert.equal(inv.current.reserveDays,0);
});

test("unverified metadata accumulation never inflates the verified article count",()=>{
  const archive=accumulateStock(null,daily([
    src("https://ec.europa.eu/news/a"),
    src("https://ec.europa.eu/news/b")
  ]),NOW);
  const inv=measureLibrary({published,ideas,reserve,sources,stock:archive,now:NOW});
  assert.equal(inv.current.unverifiedCandidates,2);
  assert.equal(inv.current.verifiedTotal,live.length);
  assert.equal(inv.launchReady,false);
  assert.equal(inv.perTopic.find(t=>t.topic==="economie").candidates,2);
});

test("invalid reserve claims are rejected, not counted as approved work",()=>{
  const fake={...reserve,items:[{slug:"not-really-approved",status:"approved",topic:"finance"}]};
  assert.throws(()=>measureLibrary({published,ideas,reserve:fake,sources,now:NOW}),/human approval/);
});

test("private HTML report escapes untrusted candidate titles and stays out of the public feed",()=>{
  const archive=accumulateStock(null,daily([src("https://ec.europa.eu/news/safe",'<img src=x onerror="alert(1)">')]),NOW);
  const inv=measureLibrary({published,ideas,reserve,sources,stock:archive,now:NOW});
  const html=inventoryHtml(inv);
  assert.match(html,/&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.ok(!html.includes('<img src=x onerror="alert(1)">'));
  assert.match(html,/non vérifiées/);
  assert.match(html,/noindex,nofollow/);
  assert.ok(!html.includes("button id=\"publish\""));
});
