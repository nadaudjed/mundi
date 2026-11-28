import { expect, test } from "./fixtures";

/** Couvertures MUNDI pour les contenus sans photo (ticket 136), sur le site normal. */
const HERSTATT = "herstatt-26-juin-1974-la-faillite-qui-a-fait-naitre-le-comite-de-bale";
const FRANCHISE = "comment-fonctionne-une-franchise-marque-savoir-faire-et-redevances";
const GAZ = "sortie-du-gaz-l-etat-publie-son-guide-pour-fermer-des-reseaux-rue-par-rue";
const EURO = "zone-euro-la-carte-depasse-pour-la-premiere-fois-les-especes-dans-les-magasins";
const AMOCO = "amoco-cadiz-1978-la-maree-noire-qui-a-souille-360-km-de-cotes-bretonnes";

const feedCard = (page: import("@playwright/test").Page, slug: string) =>
  page.locator(`[data-publication="${slug}"]:is([data-testid="verified-card"], [data-testid="today-card"])`).getByTestId("card-visual");

test("fil : chaque contenu sans photo reçoit sa couverture, une photo approuvée reste en place", async ({ page }) => {
  await page.goto("/fil/");
  const herstatt = feedCard(page, HERSTATT).locator('[data-visual="couverture"]');
  await expect(herstatt).toHaveAttribute("data-cover", "date");
  await expect(herstatt.getByTestId("cover-date")).toHaveText("1974");
  await expect(herstatt).toHaveAttribute("aria-hidden", "true");
  await expect(feedCard(page, FRANCHISE).locator('[data-visual="couverture"]')).toHaveAttribute("data-cover", "concept");
  await expect(feedCard(page, GAZ).locator('[data-visual="couverture"]')).toHaveAttribute("data-cover", "actualite");
  const euro = feedCard(page, EURO).locator('[data-visual="couverture"]');
  await expect(euro).toHaveAttribute("data-cover", "chiffre");
  await expect(euro).toContainText("Source : BCE");
  await expect(feedCard(page, AMOCO).locator('[data-visual="couverture"]')).toHaveCount(0);
  await expect(feedCard(page, AMOCO).getByTestId("editorial-photo")).toHaveCount(1);
  // Décor dessiné en ligne : aucune image téléchargée pour les couvertures.
  await expect(page.locator('[data-visual="couverture"] img')).toHaveCount(0);
});

test("article sans photo : couverture en tête ; article avec photo : la photo et son crédit", async ({ page }) => {
  await page.goto(`/actualites/${HERSTATT}/`);
  await expect(page.getByTestId("publication-cover").locator('[data-cover="date"]')).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await page.goto(`/actualites/${AMOCO}/`);
  await expect(page.getByTestId("publication-cover")).toHaveCount(0);
  await expect(page.getByTestId("publication-photo").getByTestId("editorial-photo-credit")).toBeVisible();
});

test.describe("repli", () => {
  test.use({ allowedErrors: /404|Failed to load resource/ });
  test("photo introuvable : la couverture MUNDI prend sa place, jamais une image cassée", async ({ page }) => {
    await page.route("**/media/editorial/**", (route) => route.fulfill({ status: 404, body: "" }));
    await page.goto("/fil/");
    const card = page.locator(`[data-publication="${AMOCO}"]`).first();
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByTestId("card-visual").locator('[data-visual="couverture"]')).toBeVisible();
    await expect(card.getByTestId("card-visual").locator("img")).toHaveCount(0);
  });
});
