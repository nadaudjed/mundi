import { expect, test } from "./fixtures";

/** Animation d'entrée avec le logo : à l'arrivée sur le site (pas plus d'une fois par 30 min), jamais bloquante, calme si l'appareil réduit les animations. */

test("l'animation d'entrée se joue puis s'efface d'elle-même", async ({ page }) => {
  await page.goto("/?intro=1");
  const splash = page.locator(".intro");
  await expect(page.locator("html")).toHaveAttribute("data-intro", "play");
  await expect(splash).toBeVisible();
  await expect(splash).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("html")).not.toHaveAttribute("data-intro", /.*/, { timeout: 5000 });
  await expect(splash).toBeHidden();
  expect(Number(await page.evaluate(() => localStorage.getItem("mundi:intro")))).toBeGreaterThan(0);
});

test("un toucher raccourcit l'animation", async ({ page }) => {
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
  await expect(splash).toBeHidden({ timeout: 5000 });
});
