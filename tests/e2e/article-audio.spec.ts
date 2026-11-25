import { expect, test } from "./fixtures";

const PORT = Number(process.env.E2E_PORT ?? 4173);
test.use({ baseURL: `http://localhost:${PORT + 1}` });

const SLUG = "test-publication-energie";
const spoken = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.slice());

test.describe("Version audio enregistrée des articles", () => {
  test("le Fil lit le fichier audio (pas la voix du téléphone), avec pause et reprise", async ({ page }) => {
    await page.goto("/fil/");
    const card = page.locator('[data-index="0"]');
    await expect(card).toContainText("Exemple de test");
    const audioRequest = page.waitForRequest((r) => r.url().endsWith("/media/audio/" + SLUG + ".mp3"));
    await card.getByRole("button", { name: "Écouter le résumé" }).click();
    await audioRequest;
    await expect(card.getByRole("button", { name: "Mettre en pause la lecture audio" })).toBeVisible();
    await expect(card.getByRole("status")).toContainText("Lecture en cours");
    expect(await spoken(page)).toHaveLength(0);

    await card.getByRole("button", { name: "Mettre en pause la lecture audio" }).click();
    await expect(card.getByRole("status")).toContainText("En pause");
    await card.getByRole("button", { name: "Reprendre la lecture audio" }).click();
    await expect(card.getByRole("status")).toContainText("Lecture en cours");
    await card.getByRole("button", { name: "Arrêter la lecture audio" }).click();
    await expect(card.getByRole("button", { name: "Écouter le résumé" })).toHaveAttribute("aria-pressed", "false");
  });

  test("la page article lit aussi le fichier audio jusqu'au bout", async ({ page }) => {
    await page.goto("/actualites/" + SLUG + "/");
    await page.getByRole("button", { name: "Écouter le résumé" }).click();
    await expect(page.getByRole("button", { name: "Mettre en pause la lecture audio" })).toBeVisible();
    // Le fichier de test dure 4 s : le bouton revient seul à « Écouter ».
    await expect(page.getByRole("button", { name: "Écouter le résumé" })).toHaveAttribute("aria-pressed", "false", { timeout: 10_000 });
  });

  test.describe("fichier introuvable", () => {
    test.use({ allowedErrors: /404|Failed to load resource/ });
    test("message clair, puis Réessayer utilise la voix du téléphone", async ({ page }) => {
      await page.route("**/media/audio/**", (route) => route.fulfill({ status: 404, body: "" }));
      await page.goto("/actualites/" + SLUG + "/");
      await page.getByRole("button", { name: "Écouter le résumé" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Version audio indisponible" })).toBeVisible();
      await page.getByRole("button", { name: "Écouter le résumé" }).click();
      await expect(page.getByRole("button", { name: "Mettre en pause la lecture audio" })).toBeVisible();
      expect((await spoken(page)).length).toBeGreaterThan(0);
    });
  });
});
