import test from "node:test";
import assert from "node:assert/strict";
import {checkTargets,probe} from "../scripts/check-live-netlify.mjs";
const pages=[{status:"published",slug:"actualite-verifiee",title:"Une actualité vérifiée avec prudence"}];
test("production targets cover home, news index and the published story",()=>{
  const v=checkTargets(pages);
  assert.deepEqual(v.map(x=>x.path),["/","/actualites/","/explorer/","/reviser/","/actualites/actualite-verifiee/"]);
  assert.throws(()=>checkTargets([]),/No real publications/);
  assert.throws(()=>checkTargets([{...pages[0],slug:"../evil"}]),/Unsafe/);
});
test("smoke passes only with actual news HTML on the expected host",async()=>{
  const targets=checkTargets(pages),html="<html><head><title>MUNDI Réviser les actualités et les cours</title></head><body>Les publications documentées — Explorer les sujets et les publications — Une actualité vérifiée</body></html>".repeat(6);
  const fetcher=async url=>({ok:true,status:200,url,text:async()=>html});
  assert.equal((await probe("https://mundiapptest.netlify.app",targets,fetcher)).ok,true);
  assert.equal((await probe("https://mundiapptest.netlify.app",targets,async url=>
    ({ok:true,status:200,url,text:async()=>"<html><body>no public story</body></html>".repeat(15)}))).ok,false);
  assert.equal((await probe("https://mundiapptest.netlify.app",targets,async url=>
    ({ok:false,status:404,url,text:async()=>html}))).ok,false);
  await assert.rejects(probe("https://untrusted.example",targets,fetcher),/Unexpected host/);
});
