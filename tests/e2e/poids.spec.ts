import { expect, test } from "./fixtures";

/**
 * Poids des pages (ticket #120) : Explorer, Réviser et Bibliothèque ne reçoivent plus les
 * publications complètes. Mesure détaillée : node scripts/measure-pages.mjs, docs/POIDS_DES_PAGES.md.
 */
const HEAVY = ["cardPhotos", "backdrops", "searchQuery", "sections", "retrievedAt"];

for (const [path, extra] of [["/explorer/", []], ["/reviser/", ["dataCards", "photo"]], ["/enregistres/", ["dataCards", "keyPoints", "photo"]]] as const) {
  test(`${path} ne contient pas les publications complètes`, async ({ request }) => {
    const html = await (await request.get(path)).text();
    for (const field of [...HEAVY, ...extra]) expect(html.includes(`\\"${field}\\"`), `${path} : champ ${field}`).toBe(false);
  });
}
