import { readFileSync } from "node:fs";
import { expect, isMobile, test } from "./fixtures";

const first = (JSON.parse(readFileSync("content/publications.json", "utf8")) as { slug: string; title: string; status: string }[])
  .filter((p) => p.status === "published")[0];

test.describe("Écoute, sauvegarde et navigation", () => {
  test("le bouton Écouter lit la version audio enregistrée de l'article, puis s'arrête", async ({ page }) => {
    await page.goto("/fil/");
    const card = page.locator('[data-index="0"]');
    const mp3 = page.waitForRequest((r) => /\/media\/audio\/[a-z0-9-]+\.mp3$/.test(r.url()));
    await card.getByRole("button", { name: "Écouter le résumé" }).click();
    await mp3;
    await expect(card.getByRole("button", { name: "Mettre en pause la lecture audio" })).toHaveAttribute("aria-pressed", "true");
    // Le fichier audio est lu : la voix du téléphone n'est pas utilisée.
    expect(await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)).toHaveLength(0);
    await card.getByRole("button", { name: "Arrêter la lecture audio" }).click();
    await expect(card.getByRole("button", { name: "Écouter le résumé" })).toHaveAttribute("aria-pressed", "false");
  });

  test("enregistrer une publication la fait apparaître dans Enregistrés, même après rechargement", async ({ page }) => {
    await page.goto(`/actualites/${first.slug}/`);
    await page.locator("#contenu").getByRole("button", { name: /^Enregistrer « / }).first().click();
    await expect(page.getByRole("status").filter({ hasText: "Enregistré" }).first()).toBeVisible();
    await page.goto("/enregistres/");
    await page.reload();
    await expect(page.getByRole("link", { name: first.title })).toBeVisible();
    await page.getByRole("button", { name: "Tout effacer" }).click();
    await expect(page.getByText("Rien d'enregistré pour l'instant")).toBeVisible();
  });

  test("la navigation principale mène à chaque section", async ({ page }) => {
    await page.goto("/fil/");
    const nav = page.getByRole("navigation", { name: "Navigation principale" }).locator("visible=true");
    const targets: [string, RegExp][] = [
      ["Explorer", /\/explorer\/$/],
      ["Réviser", /\/reviser\/$/],
      ["Bibliothèque", /\/enregistres\/$/],
      ["Accueil", /\/$/],
    ];
    for (const [label, url] of targets) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(url);
      await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    }
    // Mes sujets n'est plus un onglet : il est dans l'en-tête, à la même URL.
    await page.getByTestId("header-settings").click();
    await expect(page).toHaveURL(/\/mes-sujets\/$/);
    await expect(page.getByTestId("header-settings")).toHaveAttribute("aria-current", "page");
    expect(isMobile(page) ? "mobile" : "desktop").toBeTruthy();
  });
});
