import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";

/**
 * Pilote « Aujourd'hui » (ticket 109), sur le site normal : la sélection est fixée par
 * content/aujourdhui.json, les trois démonstrateurs sont de vrais articles publiés.
 */
const today = JSON.parse(readFileSync("content/aujourdhui.json", "utf8")) as { selection: string[] };
const [SHABA, TEXTILES, LEHMAN] = today.selection;

test.describe("Édition « Aujourd'hui »", () => {
  test("trois sujets en tête du fil, puis le fil complet sans doublon", async ({ page }) => {
    await page.goto("/fil/");
    const cards = page.getByTestId("today-card");
    await expect(cards).toHaveCount(3);
    for (const [i, slug] of today.selection.entries()) {
      await expect(page.locator(`[data-index="${i}"]`)).toHaveAttribute("data-publication", slug);
    }
    await expect(page.locator('[data-index="3"]')).toHaveAttribute("data-testid", "verified-card");
    for (const slug of today.selection) await expect(page.locator(`[data-testid="verified-card"][data-publication="${slug}"]`)).toHaveCount(0);
    // « Tout le fil » saute la sélection.
    await page.locator('[data-index="0"]').getByTestId("today-skip").click();
    await expect(page.locator('[data-index="3"]')).toBeInViewport({ ratio: 0.9 });
  });

  test("carte : rubrique, format, visuel du sujet, deux phrases et « Comprendre »", async ({ page }) => {
    await page.goto("/fil/");
    const card = page.locator('[data-index="0"]');
    await expect(card).toContainText("Aujourd'hui · 1/3");
    await expect(card).toContainText("Matériaux critiques");
    await expect(card.getByTestId("card-visual")).toHaveAttribute("data-visual-kind", "carte");
    await expect(card.getByRole("img")).toHaveAttribute("alt", /Shaba/);
    await expect(card.getByTestId("today-understand")).toBeVisible();
    await expect(card.getByRole("button", { name: "Écouter le résumé" })).toBeVisible();
    await expect(card.getByRole("button", { name: /Enregistrer/ })).toBeVisible();
    const text = (await card.getByTestId("today-text").textContent()) ?? "";
    expect((text.match(/[.!?…](\s|$)/g) ?? []).length).toBeLessThanOrEqual(2);
  });

  test("Comprendre ouvre le décryptage, et le retour retrouve la carte du fil", async ({ page }) => {
    await page.goto("/fil/");
    await page.locator('[data-index="0"]').getByTestId("today-skip").click();
    await page.locator('[data-index="2"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-index="2"]')).toBeInViewport({ ratio: 0.9 });
    await page.locator('[data-index="2"]').getByTestId("today-understand").click();
    await expect(page).toHaveURL(new RegExp(`/actualites/${LEHMAN}/#comprendre$`));
    await expect(page.getByTestId("decryptage-article")).toBeVisible();
    await page.goBack();
    await expect(page.locator('[data-index="2"]')).toBeInViewport({ ratio: 0.9 });
  });

  test("les trois niveaux, les sources, la question reliée à Réviser", async ({ page }) => {
    await page.goto(`/actualites/${TEXTILES}/`);
    for (const id of ["essentiel", "comprendre", "approfondir", "sources"]) await expect(page.locator(`#${id}`)).toBeAttached();
    await expect(page.getByTestId("decryptage-question")).toHaveCount(3);
    await expect(page.getByTestId("decryptage-figure").getByTestId("decryptage-visual")).toHaveAttribute("data-visual", "graphique");
    // Chaque chiffre renvoie à une source de la liste, avec son périmètre.
    const figure = page.getByTestId("figure").first();
    await expect(figure).toContainText("Périmètre");
    const ref = await figure.getByRole("link").getAttribute("href");
    await expect(page.locator(ref!)).toBeAttached();
    await expect(page.getByTestId("source-item").first().getByRole("link")).toHaveAttribute("href", /^https:\/\//);
    await page.getByRole("button", { name: "Voir la réponse" }).click();
    await expect(page.getByTestId("quiz-answer")).toContainText("Non");
    await expect(page.getByTestId("decryptage-link")).toHaveAttribute("href", /\/actualites\/.+\//);
    await page.goto("/reviser/");
    await expect(page.getByText(/peut-on dire que 78/).first()).toBeAttached();
  });

  test("partage : titre court et image du sujet", async ({ page, request }) => {
    await page.goto(`/actualites/${SHABA}/`);
    const og = (p: string) => page.locator(`meta[property="${p}"]`).getAttribute("content");
    expect(await og("og:title")).toContain("Shaba");
    const image = (await og("og:image"))!;
    expect(image).toMatch(/\/media\/pilote\/shaba-partage\.png$/);
    expect((await request.get(new URL(image).pathname)).status()).toBe(200);
  });

  test.describe("repli", () => {
    test.use({ allowedErrors: /404|Failed to load resource/ });
    test("visuel introuvable : couverture MUNDI, jamais une image cassée", async ({ page }) => {
      await page.route("**/media/pilote/**", (route) => route.fulfill({ status: 404, body: "" }));
      await page.goto("/fil/");
      const visual = page.locator('[data-index="0"]').getByTestId("card-visual");
      await expect(visual.locator('[data-visual="couverture"]')).toBeVisible();
      await expect(visual.locator("img")).toHaveCount(0);
    });
  });
});

test.describe("Mini-lecteur partagé", () => {
  test("lecture après appui, pause, reprise, puis continuité en ouvrant l'article", async ({ page }) => {
    await page.goto("/fil/");
    const card = page.locator('[data-index="0"]');
    await expect(page.getByTestId("mini-player")).toHaveCount(0);
    await card.getByRole("button", { name: "Écouter le résumé" }).click();
    const mini = page.getByTestId("mini-player");
    await expect(mini).toHaveAttribute("data-phase", "playing");
    await mini.getByRole("button", { name: "Pause du lecteur" }).click();
    await expect(mini).toHaveAttribute("data-phase", "paused");
    await expect(card.getByRole("button", { name: "Reprendre la lecture audio" })).toBeVisible();
    await mini.getByRole("button", { name: "Reprendre le lecteur" }).click();
    await expect(mini).toHaveAttribute("data-phase", "playing");
    // Navigation interne : le son continue et le mini-lecteur reste là.
    await card.getByTestId("today-understand").click();
    await expect(page.getByTestId("decryptage-article")).toBeVisible();
    await expect(page.getByTestId("mini-player")).toHaveAttribute("data-phase", "playing");
    await expect(page.getByRole("button", { name: "Mettre en pause la lecture audio" })).toBeVisible();
    await page.getByTestId("mini-player").getByRole("button", { name: "Fermer le lecteur" }).click();
    await expect(page.getByTestId("mini-player")).toHaveCount(0);
  });

  test("une autre piste remplace la première", async ({ page }) => {
    await page.goto("/fil/");
    await page.locator('[data-index="0"]').getByRole("button", { name: "Écouter le résumé" }).click();
    await expect(page.getByTestId("mini-player")).toContainText("Shaba");
    await page.locator('[data-index="0"]').getByTestId("today-skip").click();
    await page.locator('[data-index="1"]').scrollIntoViewIfNeeded();
    await page.locator('[data-index="1"]').getByRole("button", { name: "Écouter le résumé" }).click();
    await expect(page.getByTestId("mini-player")).toContainText("textiles");
    await expect(page.getByTestId("mini-player")).toHaveAttribute("data-phase", "playing");
    await expect(page.getByTestId("mini-player")).toHaveCount(1);
  });

  test.describe("fichier indisponible", () => {
    test.use({ allowedErrors: /404|Failed to load resource/ });
    test("message clair et voix du téléphone en secours", async ({ page }) => {
      await page.route("**/media/audio/**", (route) => route.fulfill({ status: 404, body: "" }));
      await page.goto(`/actualites/${LEHMAN}/`);
      await page.getByRole("button", { name: "Écouter le résumé" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Version audio indisponible" })).toBeVisible();
      await page.getByRole("button", { name: "Écouter le résumé" }).click();
      await expect(page.getByRole("button", { name: "Mettre en pause la lecture audio" })).toBeVisible();
    });
  });
});

test("320 px : pas de défilement horizontal, titre, essentiel et Comprendre visibles", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, locale: "fr-FR" });
  const page = await ctx.newPage();
  for (const path of ["/", `/actualites/${SHABA}/`]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  }
  await page.goto("/fil/");
  const card = page.locator('[data-index="0"]');
  await expect(card.getByRole("heading", { level: 2 })).toBeInViewport();
  await expect(card.getByTestId("today-text")).toBeInViewport();
  await expect(card.getByTestId("today-understand")).toBeInViewport();
  await ctx.close();
});

test("contrôle éditorial : statut, points à relire, sujets sensibles en tête", async ({ page }) => {
  await page.goto("/atelier/aujourdhui/");
  const items = page.getByTestId("today-review-item");
  await expect(items).toHaveCount(3);
  await expect(items.first()).toHaveAttribute("data-sensitive", "true");
  await expect(items.last()).toHaveAttribute("data-sensitive", "false");
  await expect(page.getByTestId("today-studio")).toContainText("Contrôle IA, sans relecture humaine");
});
