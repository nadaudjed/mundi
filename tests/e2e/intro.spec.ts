import { expect, test } from "./fixtures";

/** Animation d'entrée avec le logo (#113) : une seule fois, à la première visite de l'accueil, environ 5 s, coupée au moindre geste, calme si l'appareil réduit les animations. */

test("l'animation d'entrée se joue puis s'efface d'elle-même", async ({ page }) => {
  await page.goto("/?intro=1");
  const splash = page.locator(".intro");
  await expect(page.locator("html")).toHaveAttribute("data-intro", "play");
  await expect(splash).toBeVisible();
  await expect(splash).toHaveAttribute("aria-hidden", "true");
  // Assez longue pour être vue (4 à 5 s demandées) : toujours là après 3,5 s.
  await page.waitForTimeout(3500);
  await expect(page.locator("html")).toHaveAttribute("data-intro", "play");
  await expect(page.locator("html")).not.toHaveAttribute("data-intro", /.*/, { timeout: 8000 });
  await expect(splash).toBeHidden();
  expect(Number(await page.evaluate(() => localStorage.getItem("mundi:intro:v2")))).toBeGreaterThan(0);
});

test("le moindre toucher coupe l'animation aussitôt", async ({ page }) => {
  await page.goto("/?intro=1");
  await expect(page.locator("html")).toHaveAttribute("data-intro", "play");
  await page.mouse.click(10, 10);
  await expect(page.locator("html")).not.toHaveAttribute("data-intro", /.*/, { timeout: 800 });
});

test("pas d'animation pour les tests automatisés", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".intro")).toBeHidden();
});

test("version calme si l'appareil réduit les animations : logo fixe puis fondu", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?intro=1");
  const splash = page.locator(".intro");
  await expect(splash).toBeVisible();
  await expect(page.locator(".intro-word")).toHaveCSS("opacity", "1");
  await expect(splash).toBeHidden({ timeout: 8000 });
});

test("une seule fois, à la première visite de l'accueil ; jamais sur un lien direct ni après une absence", async ({ page }) => {
  // Lecteur réel (pas un robot de test).
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
  const html = page.locator("html");
  // Lien direct vers une autre page : pas d'animation.
  await page.goto("/explorer/");
  await expect(page.locator(".intro")).toBeHidden();
  await page.goto("/");
  await expect(html).toHaveAttribute("data-intro", "play");
  await expect(html).not.toHaveAttribute("data-intro", /.*/, { timeout: 8000 });
  // Rechargement, ou retour après une longue absence : plus d'animation.
  await page.reload();
  await expect(page.locator(".intro")).toBeHidden();
  await page.evaluate(() => {
    localStorage.setItem("mundi:intro:v2", String(Date.now() - 3 * 60 * 60 * 1000));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(html).not.toHaveAttribute("data-intro", /.*/);
});

test("le commentaire ajouté par Netlify ne casse ni la page ni l'animation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Netlify insère ce commentaire dans le <head> des pages servies en ligne.
  await page.route(/\/(\?intro=1)?$/, async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(
      '<meta charSet="utf-8"/>',
      '<meta charSet="utf-8"/>\n<!-- This site is hosted on Netlify. -->',
    );
    await route.fulfill({ response, body: html });
  });
  await page.goto("/?intro=1");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-intro", "play");
  // L'animation dure jusqu'au bout : encore là après 1,5 s (avant, elle disparaissait dès l'hydratation).
  await page.waitForTimeout(1500);
  await expect(html).toHaveAttribute("data-intro", "play");
  await expect(page.locator(".intro")).toBeVisible();
  expect(errors.filter((m) => m.includes("418"))).toEqual([]);
});
