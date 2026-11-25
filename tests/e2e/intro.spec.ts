import { expect, test } from "./fixtures";

/** Animation d'entrée avec le logo : à l'arrivée sur le site (pas plus d'une fois par 30 min), jamais bloquante, calme si l'appareil réduit les animations. */

test("l'animation d'entrée se joue puis s'efface d'elle-même", async ({ page }) => {
  await page.goto("/?intro=1");
  const splash = page.locator(".intro");
  await expect(page.locator("html")).toHaveAttribute("data-intro", "play");
  await expect(splash).toBeVisible();
  await expect(splash).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("html")).not.toHaveAttribute("data-intro", /.*/, { timeout: 7000 });
  await expect(splash).toBeHidden();
  expect(Number(await page.evaluate(() => localStorage.getItem("mundi:intro")))).toBeGreaterThan(0);
});

test("un toucher raccourcit l'animation", async ({ page }) => {
  await page.goto("/?intro=1");
  await expect(page.locator("html")).toHaveAttribute("data-intro", "play");
  // Un toucher dès l'ouverture est ignoré (geste involontaire)…
  await page.mouse.click(10, 10);
  await expect(page.locator("html")).toHaveAttribute("data-intro", "play");
  // …mais après une seconde, il coupe l'animation.
  await page.waitForTimeout(1300);
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
  await expect(splash).toBeHidden({ timeout: 7000 });
});

test("rejouée au retour dans l'application après 30 minutes d'absence, pas avant", async ({ page }) => {
  // Lecteur réel (pas un robot de test) : l'animation se joue au premier chargement.
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-intro", "play");
  await expect(html).not.toHaveAttribute("data-intro", /.*/, { timeout: 7000 });
  const back = (hiddenFor: number) =>
    page.evaluate((ms) => {
      localStorage.setItem("mundi:intro", String(Date.now() - ms));
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    }, hiddenFor);
  await back(5 * 60 * 1000);
  await expect(html).not.toHaveAttribute("data-intro", /.*/);
  await back(45 * 60 * 1000);
  await expect(html).toHaveAttribute("data-intro", "play");
  // Rechargement juste après : pas de nouvelle animation.
  await page.reload();
  await expect(page.locator(".intro")).toBeHidden();
});
