import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

test("manual newsroom job produces empty internal report when publisher permissions are pending", () => {
  {
    // Running with the real catalogue must not call publishers while all sources disabled.
    const stdout = execFileSync(process.execPath,["scripts/run-editorial-inbox.mjs"],{ encoding:"utf8" });
    assert.match(stdout,/0 enabled feeds/);
    const out=JSON.parse(readFileSync("reports/editorial-inbox.json","utf8"));
    assert.equal(out.count,0);
    assert.equal(out.items.length,0);
    assert.match(readFileSync("reports/editorial-inbox.html","utf8"),/Aucune source RSS activée/);
  }
});
