import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateReviewDraft } from "../scripts/validate-review-packs.mjs";

const draft = JSON.parse(readFileSync("editorial/reviews/textile-2024/draft.json", "utf8"));
test("MUNDI textile pilot remains an internal, non-published draft",()=>{
  assert.deepEqual(validateReviewDraft(draft),[]);
  assert.equal(draft.status,"draft");
  assert.equal(draft.reviewedBy,"");
  assert.equal(draft.publishedAt,null);
});
test("review cannot masquerade as an approved publication",()=>{
  const unsafe = {...draft,status:"published",reviewedBy:"Unknown",publishedAt:"2026-11-23"};
  assert.ok(validateReviewDraft(unsafe).length >= 2);
});
test("review must explicitly require human sign-off",()=>{
  const unsafe = {...draft,editorialNotes:{...draft.editorialNotes,approvalRequired:false}};
  assert.match(validateReviewDraft(unsafe).join(" "),/approval/);
});
test("unattributed or invalid sources are not acceptable",()=>{
  const unsafe = {...draft,sources:[{label:"Unverified",url:"javascript:alert(1)"}]};
  assert.ok(validateReviewDraft(unsafe).some(x=>x.includes("HTTPS")));
});
