import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, makeReport } from "../scripts/render-editorial-report.mjs";

test("HTML special characters are escaped in candidate title and metadata", () => {
  const html = makeReport({
    generatedAt:"2026-11-23T00:00:00.000Z",
    items:[{
      title:'<img src=x onerror=alert(1)> & "quotes"',
      link:"https://www.lemonde.fr/exemple",
      publisher:"Le Monde",
      topicHint:"geopolitique",
      publishedAt:null
    }], errors:[]
  });
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("target=\"_blank\" rel=\"noopener noreferrer\""));
});

test("disallow javascript: URLs; escape source errors", () => {
  const html = makeReport({
    generatedAt:"2026-11-23T00:00:00.000Z",
    items:[{title:"Un titre",link:"javascript:alert(1)",publisher:"X",topicHint:"finance",publishedAt:null}],
    errors:[{sourceId:"Source",error:"<script>oops</script>"}],
  });
  assert.ok(html.includes("URL invalide"));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes("&lt;script&gt;oops&lt;/script&gt;"));
});

test("empty candidate list is allowed; invalid structure is rejected", () => {
  assert.match(makeReport({generatedAt:"",items:[],errors:[]}),/Aucun sujet disponible/);
  assert.throws(()=>makeReport({items:[]}), /Collecte invalide/);
});

test("attribute Eurostat source licensing without allowing unsafe rights URLs", () => {
  const common = {generatedAt:"2026-11-23T00:00:00.000Z",errors:[]};
  const item = {title:"Eurostat News",link:"https://ec.europa.eu/eurostat/news/test",publisher:"Eurostat",topicHint:"energie",publishedAt:null};
  const allowed = makeReport({...common,items:[{...item,rightsUrl:"https://ec.europa.eu/eurostat/help/copyright-notice"}]});
  assert.ok(allowed.includes("Conditions de réutilisation"));
  const denied = makeReport({...common,items:[{...item,rightsUrl:"javascript:alert(1)"}]});
  assert.ok(!denied.includes("Conditions de réutilisation"));
});
