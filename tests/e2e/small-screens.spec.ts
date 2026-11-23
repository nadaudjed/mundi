import { expect, scrollFeedTo, test } from "./fixtures";

/**
 * Petits téléphones (ticket #35) : sur un iPhone SE (375 × 667) ou un écran
 * de 320 × 640, rien d'une carte ne doit rester caché sous la barre d'onglets.
 * Si le contenu ne tient pas, la carte défile ; la source, le crédit du fond,
 * le bouton Pause et les liens restent atteignables.
 * (Chromium seulement : ce n'est pas un test sur un vrai iPhone.)
 */
const PORT = Number(process.env.E2E_PORT ?? 4173);
const SITES = [
  { name: "site normal", url: `http://localhost:${PORT}` },
  { name: "site de test", url: `http://localhost:${PORT + 1}` },
];
const SCREENS = [
  { width: 375, height: 667 },
  { width: 320, height: 640 },
];

for (const site of SITES) {
  for (const screen of SCREENS) {
    test(`${site.name}, ${screen.width}×${screen.height} : chaque carte montre tout son contenu`, async ({ browser }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "même vérification pour les deux projets : une seule fois suffit");
      const context = await browser.newContext({ baseURL: site.url, viewport: screen, isMobile: true, hasTouch: true, locale: "fr-FR" });
      const page = await context.newPage();
      await page.goto("/");
      await expect(page.locator("[data-motion='ready']")).toHaveCount(1);
      const feedBottom = await page.getByLabel("Fil de découverte").evaluate((el) => el.getBoundingClientRect().bottom);
      const count = await page.locator("[data-index]").count();
      let checked = 0;
      for (let i = 0; i < count; i++) {
        const card = page.locator(`[data-index="${i}"]`);
        const scroller = card.getByTestId("card-scroll");
        if ((await scroller.count()) === 0) continue; // autres écrans (démonstrations, vidéos)
        await scrollFeedTo(page, i);
        // Au pire, on fait défiler la carte jusqu'en bas : son dernier élément doit apparaître au-dessus de la barre d'onglets.
        await scroller.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
        const last = await scroller.evaluate((el) => {
          const items = [...el.querySelectorAll("a, button, [data-testid='data-footer'], [data-testid='verified-sources']")];
          return Math.max(...items.map((n) => n.getBoundingClientRect().bottom));
        });
        expect(last, `carte ${i} : rien n'est coupé en bas`).toBeLessThanOrEqual(feedBottom + 1);
        // Pas de défilement horizontal dans la carte.
        expect(await scroller.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
        // Le crédit du visuel ne recouvre pas les badges de la publication.
        const credit = card.getByTestId("verified-credit");
        if (await credit.count()) {
          const [c, badges] = [await credit.boundingBox(), await card.getByText("Vérifié", { exact: true }).boundingBox()];
          expect(c!.y + c!.height, `carte ${i} : crédit au-dessus des badges`).toBeLessThanOrEqual(badges!.y + 1);
          // Les liens des sources ne passent pas sous les boutons Enregistrer et Partager.
          const right = await card.getByTestId("verified-sources").locator("a").evaluateAll((as) => Math.max(...as.map((a) => a.getBoundingClientRect().right)));
          const rail = await card.getByRole("button", { name: /Enregistrer/ }).boundingBox();
          expect(right, `carte ${i} : sources à gauche des boutons`).toBeLessThanOrEqual(rail!.x + 1);
        }
        await scroller.evaluate((el) => el.scrollTo({ top: 0 }));
        checked++;
      }
      expect(checked).toBeGreaterThan(0);
      await context.close();
    });
  }
}
