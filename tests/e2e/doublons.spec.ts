import { expect, test } from "./fixtures";

/**
 * Ticket #125 : l'article en double sur l'amende des parfums est fusionné dans la publication de
 * référence. Il disparaît du site (fil, liste, recherche) et un favori enregistré sur l'ancien
 * article mène à la référence au lieu d'être signalé comme retiré.
 * (La redirection de l'ancienne adresse est faite par Netlify : vérifiée sur l'aperçu.)
 */
const OLD = "parfums-bruxelles-inflige-471-9-millions-d-euros-d-amende-a-firmenich-givaudan";
const REF = "parfums-industriels-bruxelles-inflige-471-9-millions-d-euros-a-trois-geants-du";

test("un favori sur l'article fusionné pointe vers la publication de référence", async ({ page }) => {
  await page.goto("/enregistres/");
  await page.evaluate((key) => localStorage.setItem("mundi:bookmarks", JSON.stringify([key])), `actualite:${OLD}`);
  await page.reload();
  const saved = page.getByTestId("saved-publication");
  await expect(saved).toHaveCount(1);
  await expect(saved.locator(`a[href="/actualites/${REF}/"]`).first()).toBeVisible();
  await expect(page.getByTestId("saved-missing")).toHaveCount(0);
});

test("l'article fusionné n'apparaît plus dans la liste des publications ni dans le fil", async ({ page }) => {
  await page.goto("/actualites/");
  await expect(page.locator(`a[href="/actualites/${OLD}/"]`)).toHaveCount(0);
  await expect(page.locator(`a[href="/actualites/${REF}/"]`).first()).toBeAttached();
  const feed = await (await page.request.get("/fil.json")).text();
  expect(feed).not.toContain(OLD);
  const article = await page.request.get(`/actualites/${REF}/`);
  expect(article.ok()).toBe(true);
  expect(await article.text()).toContain("fusionné");
});
