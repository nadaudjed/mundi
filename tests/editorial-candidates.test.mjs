import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { candidateFromFeed, exportCandidates } from "../scripts/export-candidates.mjs";

const research = {
  id:"external-1",
  title:"Un thème économique à vérifier",
  link:"https://ec.europa.eu/eurostat/news/sample",
  publisher:"Eurostat",
  topicHint:"economie",
  publishedAt:"2026-11-22T10:00:00Z",
  rightsUrl:"https://ec.europa.eu/eurostat/help/copyright-notice",
  reviewStatus:"candidate_unverified",
};

test("candidate transfer never implies the headline was verified", () => {
  const candidate = candidateFromFeed(research);
  assert.equal(candidate.format,"mundi-candidate-v1");
  assert.equal(candidate.reviewStatus,"candidate_unverified");
  assert.deepEqual(candidate.source,{label:"Eurostat",url:research.link});
  assert.equal(candidate.headline,research.title);
  assert.equal(Object.hasOwn(candidate,"status"),false);
  assert.equal(Object.hasOwn(candidate,"reviewedBy"),false);
  assert.equal(Object.hasOwn(candidate,"keyPoints"),false);
});

test("reject unverified file if source is unsafe or already claimed as reviewed", () => {
  assert.equal(candidateFromFeed({...research,link:"javascript:alert(1)"}),null);
  assert.equal(candidateFromFeed({...research,reviewStatus:"verified"}),null);
  assert.equal(candidateFromFeed({...research,title:""}),null);
});

test("write unique candidate JSON files in local directory", () => {
  const dir=mkdtempSync(join(tmpdir(),"mundi-candidate-test-"));
  try {
    const data={items:[research,research,{...research,title:"Another",link:"https://ec.europa.eu/eurostat/news/another"}]};
    assert.equal(exportCandidates(data,dir),2);
    const files=readdirSync(dir);
    assert.equal(files.length,2);
    assert.ok(files.every(f=>/^mundi-candidat-[a-f0-9]{20}[.]json$/.test(f)));
    const parsed=files.map(f=>JSON.parse(readFileSync(join(dir,f),"utf8")));
    assert.ok(parsed.every(x=>x.reviewStatus==="candidate_unverified"));
    assert.ok(parsed.every(x=>!Object.hasOwn(x,"status")));
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

test("validate collector input structure",()=>{
  const dir=mkdtempSync(join(tmpdir(),"mundi-invalid-"));
  try { assert.throws(()=>exportCandidates({},dir),/Invalid editorial inbox/); }
  finally { rmSync(dir,{recursive:true,force:true}); }
});
