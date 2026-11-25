import { expect, test } from "./fixtures";

/** Animation d'entrée avec le logo : une fois par onglet, jamais bloquante, absente si l'appareil réduit les animations. */

test("l'animation d'entrée se joue puis s'efface d'elle-même", async ({ page }) => {
  await page.goto("/?intro=1");
  const splash = page.locator(".intro");
  await expect(page.locator("html")).toHaveAttribute("data-intro", "play");
  await expect(splash).toBeVisible();
  await expect(splash).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("html")).not.toHaveAttribute("data-intro", /.*/, { timeout: 3000 });
  await expect(splash).toBeHidden();
  expect(await page.evaluate(() => sessionStorage.getItem("mundi:intro"))).toBe("1");
});

test("un toucher raccourcit l'animation", async ({ page }) => {
  await page.goto("/?intro=1");
  await expect(page.locator("html")).toHaveAttribute("data-intro", "play");
  await page.mouse.click(10, 10);
  await expect(page.locator("html")).not.toHaveAttribute("data-intro", /.*/, { timeout: 800 });
});

test("pas d'animation pour les tests automatisés ni si l'appareil réduit les animations", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".intro")).toBeHidden();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?intro=1");
  await expect(page.locator(".intro")).toBeHidden();
});
