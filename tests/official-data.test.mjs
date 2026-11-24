import test from "node:test";
import assert from "node:assert/strict";
import { parseJsonStat, parseInseeSdmx, eurostat, insee, texte, formatResult } from "../scripts/official-data.mjs";

const jsonStat = {
  label: "Chômage", updated: "2026-11-24T11:00:00+0100", value: { "0": 4.1, "1": 4.2, "3": 8.5 },
  id: ["unit", "geo", "time"], size: [1, 2, 2],
  dimension: {
    unit: { category: { index: { PC_ACT: 0 }, label: { PC_ACT: "% de la population active" } } },
    geo: { category: { index: { DE: 0, FR: 1 }, label: { DE: "Allemagne", FR: "France" } } },
    time: { category: { index: { "2026-09": 0, "2026-10": 1 } } },
  },
};
const fakeFetch = (body, type = "application/json") => async () => ({ ok: true, status: 200, headers: new Map([["content-type", type]]),
  json: async () => body, text: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });

test("JSON-stat Eurostat : chaque valeur garde son pays et sa période, les valeurs absentes ne sont pas inventées", () => {
  const rows = parseJsonStat(jsonStat);
  assert.deepEqual(rows.map((r) => [r.dims.geo, r.time, r.value]), [["Allemagne", "2026-09", 4.1], ["Allemagne", "2026-10", 4.2], ["France", "2026-10", 8.5]]);
});

test("Eurostat : adresse à citer lisible et dimensions répétables", async () => {
  let asked;
  const r = await eurostat("UNE_RT_M", [["geo", "FR"], ["geo", "DE"]], 2, { fetcher: async (u, o) => { asked = u; return fakeFetch(jsonStat)(u, o); } });
  assert.match(asked, /geo=FR&geo=DE&lastTimePeriod=2/);
  assert.equal(r.aCiter, "https://ec.europa.eu/eurostat/databrowser/view/une_rt_m/default/table");
  const out = formatResult(r);
  assert.match(out, /Champ : unit = % de la population active/);
  assert.match(out, /France \| 2026-10 : 8.5/);
});

const sdmx = `<message:DataSet><Series IDBANK="001688527" TITLE_FR="Taux de chômage au sens du BIT - France" UNIT_MEASURE="POURCENT" LAST_UPDATE="2026-11-10">
<Obs TIME_PERIOD="2026-Q3" OBS_VALUE="8.2" OBS_STATUS="A"/><Obs TIME_PERIOD="2026-Q2" OBS_VALUE="8.3" OBS_STATUS="A"/></Series></message:DataSet>`;
test("Insee BDM : série, unité et observations dans l'ordre", async () => {
  assert.deepEqual(parseInseeSdmx(sdmx)[0].lignes.map((l) => l.value), [8.3, 8.2]);
  const r = await insee("001688527", 2, { fetcher: fakeFetch(sdmx, "application/xml") });
  assert.equal(r.aCiter, "https://www.insee.fr/fr/statistiques/serie/001688527");
  assert.equal(r.unite, "POURCENT");
});

test("texte : réservé aux sites officiels prévus", async () => {
  await assert.rejects(texte("https://example.com/page"), /Hôte non prévu/);
  const t = await texte("https://commission.europa.eu/x", { fetcher: fakeFetch("<html><script>x()</script><p>Budget&nbsp;: 1 200 €</p></html>", "text/html") });
  assert.equal(t.texte, "Budget : 1 200 €");
});
