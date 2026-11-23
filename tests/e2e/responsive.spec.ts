import { expect, test } from "./fixtures";

/**
 * Interface adaptée à chaque écran : rien ne déborde sur le côté, la navigation
 * tient sur une ligne, et sur les aperçus Netlify la barre d'onglets laisse le
 * coin bas-droit à l'outil « Netlify Drawer » (qui cachait « Mes sujets »).
 */
const PORT = Number(process.env.E2E_PORT ?? 4173);
const PAGES = ["/", "/explorer/", "/reviser/", "/enregistres/", "/mes-sujets/", "/recit/equilibre-reseau-electrique/", "/a-propos/"];
const SCREENS = [
  { name: "petit téléphone", width: 320, height: 640, mobile: true },
  { name: "téléphone", width: 390, height: 844, mobile: true },
  { name: "tablette", width: 768, height: 1024, mobile: true },
  { name: "tablette paysage", width: 1024, height: 768, mobile: false },
];

for (const screen of SCREENS) {
  test(`${screen.name} (${screen.width} px) : aucune page ne déborde et le menu tient sur l'écran`, async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "tailles fixées par le test : une seule fois suffit");
    const context = await browser.newContext({
      baseURL: `http://localhost:${PORT}`,
      viewport: { width: screen.width, height: screen.height },
      isMobile: screen.mobile,
      hasTouch: screen.mobile,
      locale: "fr-FR",
    });
    const page = await context.newPage();
    for (const path of PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} : pas de défilement horizontal`).toBeLessThanOrEqual(0);
      const nav = page.getByRole("navigation", { name: "Navigation principale" }).locator("visible=true");
      const links = nav.getByRole("link");
      await expect(links).toHaveCount(5);
      for (const box of await links.evaluateAll((as) => as.map((a) => a.getBoundingClientRect().toJSON()))) {
        expect(box.left, `${path} : onglet visible à gauche`).toBeGreaterThanOrEqual(0);
        expect(box.right, `${path} : onglet visible à droite`).toBeLessThanOrEqual(screen.width);
      }
    }
    await context.close();
  });
}

test("adresses Netlify : la barre d'onglets passe au-dessus du bandeau « Powered by Netlify »", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "concerne la barre d'onglets des téléphones");
  // Site de test (appli installée) et aperçu : Netlify affiche son bandeau sur les deux.
  for (const host of ["https://mundiapptest.netlify.app", "https://deploy-preview-7--mundiapptest.netlify.app"]) {
    for (const width of [320, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 760 }, isMobile: true, hasTouch: true, locale: "fr-FR", serviceWorkers: "block" });
      // L'adresse Netlify est servie par le site local.
      await context.route(`${host}/**`, async (route) => {
        const response = await route.fetch({ url: route.request().url().replace(host, `http://localhost:${PORT}`) });
        await route.fulfill({ response });
      });
      const page = await context.newPage();
      for (const path of ["/", "/reviser/"]) {
        await page.goto(`${host}${path}`);
        await expect(page.locator("html")).toHaveAttribute("data-netlify-host", "");
        const dock = page.getByTestId("dock");
        // Le bandeau de Netlify mesure environ 36 px de haut, à environ 20 px du bas.
        const bottom = await dock.evaluate((el) => window.innerHeight - el.getBoundingClientRect().bottom);
        expect(bottom, `${host}${path} à ${width} px : bas de l'écran libre`).toBeGreaterThanOrEqual(60);
        // Le fil s'arrête au-dessus de la barre : rien n'est caché dessous.
        if (path === "/") {
          const feedBottom = await page.getByLabel("Fil de découverte").evaluate((el) => el.getBoundingClientRect().bottom);
          const dockTop = await dock.evaluate((el) => el.getBoundingClientRect().top);
          expect(feedBottom).toBeLessThanOrEqual(dockTop + 1);
        }
      }
      await page.getByTestId("dock").getByRole("link", { name: "Mes sujets", exact: true }).click();
      await expect(page).toHaveURL(/\/mes-sujets\/$/);
      await context.unrouteAll({ behavior: "ignoreErrors" });
      await context.close();
    }
  }
});

test("autre adresse : la barre d'onglets reste près du bas de l'écran", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "barre d'onglets des téléphones");
  await page.goto("/reviser/");
  await expect(page.locator("html")).not.toHaveAttribute("data-netlify-host", "");
  const bottom = await page.getByTestId("dock").evaluate((el) => window.innerHeight - el.getBoundingClientRect().bottom);
  expect(bottom).toBeLessThanOrEqual(16);
});

test("téléphone : la barre du haut du fil tient sur une ligne, sur chaque carte", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "barre supérieure du fil sur téléphone");
  for (const width of [320, 375, 402, 430]) {
    const context = await browser.newContext({ baseURL: `http://localhost:${PORT}`, viewport: { width, height: 800 }, isMobile: true, hasTouch: true, locale: "fr-FR" });
    const page = await context.newPage();
    await page.goto("/");
    const feed = page.getByLabel("Fil de découverte");
    const count = await page.locator("[data-index]").count();
    for (const i of [0, Math.floor(count / 2), count - 1]) {
      await feed.evaluate((el, i) => el.scrollTo({ top: el.clientHeight * i }), i);
      await page.waitForTimeout(200);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${width} px, écran ${i} : pas de débordement`).toBeLessThanOrEqual(0);
      const right = await page.getByRole("button", { name: /Choisir un sujet/ }).evaluate((el) => el.getBoundingClientRect().right);
      expect(right, `${width} px, écran ${i} : bouton Sujets visible`).toBeLessThanOrEqual(width);
    }
    await context.close();
  }
});
