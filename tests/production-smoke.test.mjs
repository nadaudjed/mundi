import test from "node:test";
import assert from "node:assert/strict";
import {checkTargets,probe} from "../scripts/check-live-site.mjs";
const pages=[{status:"published",slug:"actualite-verifiee",title:"Une actualité vérifiée avec prudence"}];
test("production targets cover home, news index and the published story",()=>{
  const v=checkTargets(pages);
  assert.deepEqual(v.map(x=>x.path),["/","/actualites/","/explorer/","/reviser/","/actualites/actualite-verifiee/"]);
  assert.throws(()=>checkTargets([]),/No real publications/);
  assert.throws(()=>checkTargets([{...pages[0],slug:"../evil"}]),/Unsafe/);
});
test("smoke passes only with actual news HTML on the expected host",async()=>{
  const targets=checkTargets(pages),html="<html><head><title>MUNDI Réviser les actualités et les cours</title></head><body>MUNDI — fil des publications sourcées — Publications documentées — Explorer les sujets et les publications — Une actualité vérifiée</body></html>".repeat(6);
  const fetcher=async url=>({ok:true,status:200,url,text:async()=>html});
  assert.equal((await probe("https://mundi.nadaudjacques004.workers.dev",targets,fetcher)).ok,true);
  assert.equal((await probe("https://mundi.nadaudjacques004.workers.dev",targets,async url=>
    ({ok:true,status:200,url,text:async()=>"<html><body>no public story</body></html>".repeat(15)}))).ok,false);
  assert.equal((await probe("https://mundi.nadaudjacques004.workers.dev",targets,async url=>
    ({ok:false,status:404,url,text:async()=>html}))).ok,false);
  await assert.rejects(probe("https://untrusted.example",targets,fetcher),/Unexpected host/);
});
test("home and publications needles exist in the current pages",async()=>{
  const {readFileSync}=await import("node:fs");
  const norm=s=>s.replace(/\s+/g," ");
  assert.ok(norm(readFileSync("components/home/HomeEdition.tsx","utf8")).includes("MUNDI — fil des publications sourcées"));
  assert.ok(readFileSync("app/actualites/page.tsx","utf8").includes("Publications documentées"));
  assert.ok(readFileSync("app/explorer/page.tsx","utf8").includes("Explorer les sujets et les publications"));
  assert.ok(readFileSync("app/reviser/page.tsx","utf8").includes("Réviser les actualités et les cours"));
});
