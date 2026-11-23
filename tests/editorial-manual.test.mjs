import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("manual newsroom makes an empty report when no source is approved", () => {
  const dir = mkdtempSync(join(tmpdir(), "mundi-offline-"));
  try {
    // Dedicated disabled catalogue: never fetch an external source during CI.
    const output = execFileSync(process.execPath,["scripts/run-editorial-inbox.mjs"], {
      encoding: "utf8",
      env: {...process.env,
        MUNDI_SOURCES_PATH:"tests/fixtures/sources-disabled.json",
        MUNDI_REPORT_DIR:dir,
      }
    });
    assert.match(output,/0 enabled feeds/);
    const report = JSON.parse(readFileSync(join(dir,"editorial-inbox.json"),"utf8"));
    assert.equal(report.count,0);
    assert.equal(report.items.length,0);
    assert.match(readFileSync(join(dir,"editorial-inbox.html"),"utf8"),/Aucune source RSS activée/);
  } finally {
    rmSync(dir,{recursive:true,force:true});
  }
});
