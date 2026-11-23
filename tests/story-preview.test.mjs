import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validatePreview, makePreviewHtml } from "../scripts/build-story-preview.mjs";

const draft=JSON.parse(readFileSync("editorial/reviews/textile-2024/draft.json","utf8"));
const storyboard=JSON.parse(readFileSync("editorial/reviews/textile-2024/visual-story.json","utf8"));

test("pilot preview remains unpublished and contains four ordered source-linked scenes",()=>{
  assert.deepEqual(validatePreview(storyboard,draft),[]);
  assert.equal(draft.publishedAt,null);
  assert.equal(draft.reviewedBy,"");
  const html=makePreviewHtml(storyboard,draft);
  assert.equal((html.match(/class="scene scene--/g)||[]).length,4);
  assert.match(html,/Brouillon · non publié/);
  assert.match(html,/noindex,nofollow/);
  assert.match(html,/Eurostat/);
  assert.match(html,/Commission européenne/);
  assert.match(html,/Dénominateur : parmi les déchets textiles traités/);
  assert.match(html,/deux flux statistiques annuels distincts/);
  assert.match(html,/style="width:60\.870%"/);
  assert.ok(!html.includes("<img"));
  assert.ok(!html.includes("public/media/"));
});

test("published or approved status cannot be rendered by this generator",()=>{
  const changed={...draft,publishedAt:"2026-11-23",status:"published",reviewedBy:"Reviewer"};
  assert.ok(validatePreview(storyboard,changed).length>=2);
  assert.throws(()=>makePreviewHtml(storyboard,changed),/Preview rejected/);
  assert.ok(validatePreview({...storyboard,status:"published"},draft).length>0);
});

test("ratio cannot lose its precise denominator",()=>{
  const wrong=structuredClone(storyboard);
  delete wrong.scenes[2].denominator;
  assert.match(validatePreview(wrong,draft).join(" "),/denominator/);
});

test("comparison refuses conflicting units to avoid misleading bars",()=>{
  const wrong=structuredClone(storyboard);
  wrong.scenes[1].items[1].unit="kg";
  assert.match(validatePreview(wrong,draft).join(" "),/matching units/);
});

test("all editorial headings are escaped before insertion into HTML",()=>{
  const hostile=structuredClone(storyboard);
  hostile.scenes[0].headline='<img src=x onerror="alert(1)"> Un fait';
  const html=makePreviewHtml(hostile,draft);
  assert.ok(html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
  assert.ok(!html.includes('<img src=x onerror="alert(1)">'));
});

test("narrative never changes original publications data",()=>{
  const published=JSON.parse(readFileSync("content/publications.json","utf8"));
  assert.deepEqual(published,[]);
  assert.equal(storyboard.draftPath,"editorial/reviews/textile-2024/draft.json");
});


test("Claude-compatible data cards preserve the same figures, units and denominators",()=>{
  const pack=JSON.parse(readFileSync("editorial/reviews/textile-2024/data-cards.draft.json","utf8"));
  assert.equal(pack.format,"mundi-data-cards-v1");
  assert.equal(pack.cards.length,4);
  assert.equal(pack.cards[0].kind,"stat");
  assert.equal(pack.cards[0].measure.value,storyboard.scenes[0].value);
  assert.deepEqual(pack.cards[1].items.map(x=>x.value),storyboard.scenes[1].items.map(x=>x.value));
  assert.equal(pack.cards[1].presentation,"echelle-commune");
  assert.match(pack.cards[1].note,/flux statistiques annuels distincts/);
  assert.equal(pack.cards[2].measure.value,storyboard.scenes[2].value);
  assert.equal(pack.cards[2].measure.denominator,"des déchets textiles traités en 2024");
  assert.equal(pack.cards[2].measure.unit,"%");
  assert.equal(pack.cards[3].kind,"explication");
  assert.equal(pack.cards[3].steps.at(-1).nature,"hypothese");
  for(const card of pack.cards){
    assert.ok(card.source.url.startsWith("https://"));
    assert.equal(card.scene,undefined);
    assert.equal(card.visual,undefined);
  }
});
