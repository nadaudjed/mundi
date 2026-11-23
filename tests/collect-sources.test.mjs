import test from "node:test";
import assert from "node:assert/strict";
import { parseFeed, tag, plain } from "../scripts/collect-sources.mjs";
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
