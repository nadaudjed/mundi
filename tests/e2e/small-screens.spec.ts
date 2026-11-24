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
        // Le crédit du visuel ne recouvre pas le titre de la publication.
        const credit = card.getByTestId("verified-credit");
        if (await credit.count()) {
          const [c, title] = [await credit.boundingBox(), await card.getByRole("heading", { level: 2 }).boundingBox()];
          expect(c!.y + c!.height, `carte ${i} : crédit au-dessus du titre`).toBeLessThanOrEqual(title!.y + 1);
        }
        await scroller.evaluate((el) => el.scrollTo({ top: 0 }));
        checked++;
      }
      expect(checked).toBeGreaterThan(0);
      await context.close();
    });
  }
}

/** Demande du fondateur : « Lire la publication » et « Écouter » visibles à l'ouverture, sans défiler. */
for (const screen of [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 760 },
]) {
  test(`${screen.width}×${screen.height} : Lire la publication et Écouter visibles sans défiler`, async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "même vérification pour les deux projets : une seule fois suffit");
    const mobile = screen.width < 768;
    const context = await browser.newContext({ viewport: screen, isMobile: mobile, hasTouch: mobile, locale: "fr-FR", baseURL: `http://localhost:${PORT}` });
    const page = await context.newPage();
    await page.goto("/");
    const card = page.locator('[data-index="0"]');
    const read = card.getByRole("link", { name: /^Lire la publication/ });
    const listen = card.getByRole("button", { name: "Écouter le résumé" });
    const limit = mobile ? await page.getByTestId("dock").evaluate((el) => el.getBoundingClientRect().top) : screen.height;
    for (const el of [read, listen]) {
      await expect(el).toBeInViewport({ ratio: 1 });
      const box = (await el.boundingBox())!;
      expect(box.y + box.height, "au-dessus de la barre d'onglets").toBeLessThanOrEqual(limit + 1);
    }
    await context.close();
  });
}
