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

test("téléphone : la barre d'onglets est posée en bas de l'écran et ne cache pas le fil", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "barre d'onglets des téléphones");
  for (const width of [320, 390]) {
    const context = await browser.newContext({ baseURL: `http://localhost:${PORT}`, viewport: { width, height: 760 }, isMobile: true, hasTouch: true, locale: "fr-FR", serviceWorkers: "block" });
    const page = await context.newPage();
    for (const path of ["/", "/reviser/"]) {
      await page.goto(path);
      const dock = page.getByTestId("dock");
      const bottom = await dock.evaluate((el) => window.innerHeight - el.getBoundingClientRect().bottom);
      expect(bottom, `${path} à ${width} px : barre en bas de l'écran`).toBeLessThanOrEqual(16);
      if (path === "/") {
        const feedBottom = await page.getByLabel("Fil de découverte").evaluate((el) => el.getBoundingClientRect().bottom);
        const dockTop = await dock.evaluate((el) => el.getBoundingClientRect().top);
        expect(feedBottom, "le fil s'arrête au-dessus de la barre").toBeLessThanOrEqual(dockTop + 1);
      }
    }
    await page.getByTestId("dock").getByRole("link", { name: "Mes sujets", exact: true }).click();
    await expect(page).toHaveURL(/\/mes-sujets\/$/);
    await context.close();
  }
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

test("téléphone : les pages ont une barre fine avec le logo, le fil n'en a pas", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "en-tête des téléphones");
  for (const path of ["/explorer/", "/reviser/", "/a-propos/"]) {
    await page.goto(path);
    const header = page.locator("[data-site-header]");
    await expect(header).toBeVisible();
    await expect(header.getByRole("link", { name: "MUNDI, retour au fil" })).toBeVisible();
    const h = await header.evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeLessThanOrEqual(64);
  }
  await page.goto("/");
  await expect(page.locator("[data-site-header]")).toBeHidden();
});
