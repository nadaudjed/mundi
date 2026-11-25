import type { Page } from "@playwright/test";
import { expect, isMobile, test } from "./fixtures";

/** Tire le haut du Fil vers le bas, d'une distance donnée, puis relâche (événements tactiles). */
async function pullFeed(page: Page, distance: number) {
  await page.getByLabel("Fil de découverte").evaluate(async (el, distance) => {
    const touch = (y: number) => new Touch({ identifier: 1, target: el, clientX: 150, clientY: y });
    el.dispatchEvent(new TouchEvent("touchstart", { touches: [touch(120)], bubbles: true }));
    for (let y = 120; y <= 120 + distance; y += 20) {
      el.dispatchEvent(new TouchEvent("touchmove", { touches: [touch(y)], bubbles: true }));
      await new Promise((r) => requestAnimationFrame(r));
    }
    el.dispatchEvent(new TouchEvent("touchend", { touches: [], bubbles: true }));
  }, distance);
}

test.describe("Tirer pour actualiser le Fil", () => {
  // Le service worker prend la main sur la page dès qu'il est prêt (clients.claim) :
  // ses requêtes vers /fil.json échappent alors à page.route, et le test ne voit
  // jamais les « nouveaux articles » simulés (échec intermittent en CI).
  test.use({ serviceWorkers: "block" });
  test.beforeEach(({ page }) => test.skip(!isMobile(page), "Geste tactile : téléphone"));

  test("sans nouvel article : « Vous êtes à jour »", async ({ page }) => {
    await page.goto("/fil/");
    await expect(page.locator("[data-feed]")).toHaveAttribute("data-motion", "ready");
    // Le Fil peut se réorganiser juste après l'affichage (préférences, photos) : on attend la fin du chargement.
    await page.waitForLoadState("networkidle");
    await pullFeed(page, 200);
    await expect(page.getByTestId("feed-refresh")).toContainText("Vous êtes à jour");
  });

  test("un petit geste ne déclenche rien", async ({ page }) => {
    let calls = 0;
    await page.route("**/fil.json", (route) => { calls++; return route.continue(); });
    await page.goto("/fil/");
    await expect(page.locator("[data-feed]")).toHaveAttribute("data-motion", "ready");
    // Le Fil peut se réorganiser juste après l'affichage (préférences, photos) : on attend la fin du chargement.
    await page.waitForLoadState("networkidle");
    await pullFeed(page, 60);
    await page.waitForTimeout(300);
    expect(calls).toBe(0);
  });

  test("avec un nouvel article : il est annoncé puis le Fil se recharge depuis le début", async ({ page }) => {
    await page.goto("/fil/");
    await expect(page.locator("[data-feed]")).toHaveAttribute("data-motion", "ready");
    // Le Fil peut se réorganiser juste après l'affichage (préférences, photos) : on attend la fin du chargement.
    await page.waitForLoadState("networkidle");
    await page.route("**/fil.json", async (route) => {
      const res = await route.fetch();
      const body = (await res.json()) as { slugs: string[] };
      await route.fulfill({ json: { slugs: ["nouvel-article-de-test", ...body.slugs] } });
    });
    const reload = page.waitForEvent("load");
    await pullFeed(page, 200);
    await reload;
    await expect(page.locator('[data-index="0"]')).toBeInViewport({ ratio: 0.9 });
  });

  test("en revenant sur l'onglet, les nouveaux articles sont signalés sans recharger", async ({ page }) => {
    await page.goto("/fil/");
    await expect(page.locator("[data-feed]")).toHaveAttribute("data-motion", "ready");
    // Le Fil peut se réorganiser juste après l'affichage (préférences, photos) : on attend la fin du chargement.
    await page.waitForLoadState("networkidle");
    await page.route("**/fil.json", async (route) => {
      const res = await route.fetch();
      const body = (await res.json()) as { slugs: string[] };
      await route.fulfill({ json: { slugs: ["a-test", "b-test", ...body.slugs] } });
    });
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect(page.getByTestId("feed-refresh-fresh")).toHaveText("2 nouveaux articles · Afficher");
  });
});
