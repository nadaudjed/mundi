import test from "node:test";
import assert from "node:assert/strict";
import { parseFeed, tag, plain, authorizedFeeds } from "../scripts/collect-sources.mjs";
const feed={id:"test",publisher:"Le Monde",feedUrl:"https://www.lemonde.fr/international/rss_full.xml",topic:"geopolitique"};
test("extract metadata without reproducing full articles",()=>{
  const xml='<rss><item><title><![CDATA[Énergie &amp; monde]]></title><link>https://www.lemonde.fr/international/article/example.html</link><pubDate>Mon, 23 Nov 2026 05:00:00 GMT</pubDate></item></rss>';
  const result=parseFeed(xml,feed);assert.equal(result.length,1);
  assert.equal(result[0].title,"Énergie & monde");
  assert.equal(result[0].reviewStatus,"candidate_unverified");
});
test("reject foreign hosts and javascript links",()=>{
  const xml='<rss><item><title>Fake</title><link>https://example.org/p</link></item><item><title>Unsafe</title><link>javascript:alert(1)</link></item></rss>';
  assert.equal(parseFeed(xml,feed).length,0);
});
test("safe XML title decoding",()=>{
  assert.equal(tag("<title>A&amp;B</title>","title"),"A&B");
  assert.equal(plain("<b>Hello</b> world"),"Hello world");
});

const eurostat = {
  id: "eurostat-test", publisher: "Eurostat",
  feedUrl: "https://ec.europa.eu/eurostat/en/search?p_p_resource_id=atom",
  topic: "economie", enabled: true, rightsStatus: "approved_metadata_collection",
  rightsUrl: "https://ec.europa.eu/eurostat/help/copyright-notice"
};

test("extract Eurostat Atom entries with attributed links and dates", () => {
  const xml = '<feed xmlns="http://www.w3.org/2005/Atom">'+
    '<entry><title type="html">Prix &amp; énergie : vue d&#39;ensemble</title>'+
    '<link rel="self" href="https://ec.europa.eu/eurostat/en/search"/>'+
    '<link href="https://ec.europa.eu/eurostat/news/test?code=a&amp;lang=en" rel="alternate" type="text/html"/>'+
    '<updated>2026-11-23T09:00:00Z</updated></entry></feed>';
  const items = parseFeed(xml,eurostat);
  assert.equal(items.length,1);
  assert.equal(items[0].title,"Prix & énergie : vue d'ensemble");
  assert.equal(items[0].topicHint,"economie");
  assert.equal(items[0].publishedAt,"2026-11-23T09:00:00.000Z");
  assert.ok(items[0].link.includes("lang=en"));
  assert.equal(items[0].rightsUrl,eurostat.rightsUrl);
});

test("Atom feeds refuse foreign-host and unsafe links", () => {
  const xml = '<feed><entry><title>Unsafe</title>'+
    '<link rel="alternate" href="https://evil.example/article"/></entry>'+
    '<entry><title>No URL</title><link href="javascript:alert(1)" /></entry></feed>';
  assert.equal(parseFeed(xml,eurostat).length,0);
});

test("only enabled feeds with documented approved metadata rights are selected", () => {
  const denied = {...eurostat, id:"denied",rightsStatus:"pending_permission_review"};
  assert.deepEqual(authorizedFeeds([denied,{...eurostat,enabled:false},eurostat]),[eurostat]);
});

test("ECB official RSS press releases provide attributed metadata only",()=>{
  const ecb={
    id:"ecb-press",publisher:"Banque centrale européenne",
    feedUrl:"https://www.ecb.europa.eu/rss/press.html",topic:"economie",
    rightsUrl:"https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html",
    enabled:true,rightsStatus:"approved_metadata_collection"
  };
  const xml='<rss version="2.0"><channel><title>ECB</title><item>'+
    '<title><![CDATA[ECB announces interest rates &amp; outlook]]></title>'+
    '<link>https://www.ecb.europa.eu/press/pr/date/2026/html/ecb.pr261123.en.html</link>'+
    '<pubDate>Mon, 23 Nov 2026 10:00:00 GMT</pubDate>'+
    '<description>Sensitive details of an unpublished article must not be copied</description>'+
    '</item></channel></rss>';
  const items=parseFeed(xml,ecb);
  assert.equal(items.length,1);
  assert.equal(items[0].title,"ECB announces interest rates & outlook");
  assert.equal(items[0].topicHint,"economie");
  assert.equal(items[0].publisher,"Banque centrale européenne");
  assert.equal(items[0].publishedAt,"2026-11-23T10:00:00.000Z");
  assert.equal(items[0].rightsUrl,ecb.rightsUrl);
  assert.equal(Object.hasOwn(items[0],"description"),false);
});

test("NASA official RSS news-release yields attributed, dated science metadata only",()=>{
  const nasa={id:"nasa-news-releases",publisher:"NASA",feedUrl:"https://www.nasa.gov/news-release/feed/",topic:"sciences-societe",
    rightsUrl:"https://www.nasa.gov/nasa-brand-center/images-and-media/"};
  const rss='<rss version="2.0"><channel><item><title>NASA investigates Moon climate effects</title>'+
    '<link>https://www.nasa.gov/news-release/example-mission/</link>'+
    '<pubDate>Mon, 23 Nov 2026 12:00:00 GMT</pubDate>'+
    '<description>Do not republish full external materials</description></item></channel></rss>';
  const items=parseFeed(rss,nasa);
  assert.equal(items.length,1);
  assert.equal(items[0].publisher,"NASA");
  assert.equal(items[0].topicHint,"sciences-societe");
  assert.equal(items[0].publishedAt,"2026-11-23T12:00:00.000Z");
  assert.equal(Object.hasOwn(items[0],"description"),false);
  assert.equal(items[0].link,"https://www.nasa.gov/news-release/example-mission/");
});
