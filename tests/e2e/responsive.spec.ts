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

test("aperçu Netlify : la barre d'onglets laisse libre le coin bas-droit", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "concerne la barre d'onglets des téléphones");
  const host = "https://deploy-preview-7--mundiapptest.netlify.app";
  for (const width of [320, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 760 }, isMobile: true, hasTouch: true, locale: "fr-FR", serviceWorkers: "block" });
    // L'adresse d'aperçu est servie par le site local.
    await context.route(`${host}/**`, async (route) => {
      const response = await route.fetch({ url: route.request().url().replace(host, `http://localhost:${PORT}`) });
      await route.fulfill({ response });
    });
    const page = await context.newPage();
    await page.goto(`${host}/reviser/`);
    await expect(page.locator("html")).toHaveAttribute("data-netlify-preview", "");
    const dock = page.getByTestId("dock");
    const right = await dock.evaluate((el) => el.getBoundingClientRect().right);
    expect(width - right, `${width} px : coin bas-droit libre`).toBeGreaterThanOrEqual(60);
    // Chaque onglet reste nommé et cliquable.
    await dock.getByRole("link", { name: "Mes sujets", exact: true }).click();
    await expect(page).toHaveURL(/\/mes-sujets\/$/);
    await context.close();
  }
});

test("site principal : la barre d'onglets occupe toute la largeur", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "barre d'onglets des téléphones");
  await page.goto("/reviser/");
  await expect(page.locator("html")).not.toHaveAttribute("data-netlify-preview", "");
  const width = page.viewportSize()!.width;
  const right = await page.getByTestId("dock").evaluate((el) => el.getBoundingClientRect().right);
  expect(width - right).toBeLessThanOrEqual(16);
});
