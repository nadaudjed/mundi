import { expect, isMobile, test } from "./fixtures";

test.describe("Écoute, sauvegarde et navigation", () => {
  test("le bouton Écouter lit le résumé avec la voix de l'appareil, puis s'arrête", async ({ page }) => {
    await page.goto("/");
    const index = await page.locator('[data-story="inflation-expliquee-simplement"]').first().getAttribute("data-index");
    const card = page.locator(`[data-index="${index}"]`);
    await card.scrollIntoViewIfNeeded();
    const listen = card.getByRole("button", { name: "Écouter le résumé" });
    await listen.click();
    await expect(card.getByRole("button", { name: "Arrêter la lecture audio" })).toHaveAttribute("aria-pressed", "true");
    const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toContain("Trois points à retenir");
    await page.evaluate(() => (window.speechSynthesis as unknown as { finish: () => void }).finish());
    await expect(card.getByRole("button", { name: "Écouter le résumé" })).toHaveAttribute("aria-pressed", "false");
  });

  test("enregistrer un récit le fait apparaître dans Enregistrés, même après rechargement", async ({ page }) => {
    await page.goto("/recit/inflation-expliquee-simplement/");
    await page.getByRole("button", { name: /^Enregistrer « L'inflation/ }).click();
    await expect(page.getByRole("status")).toContainText("Enregistré");
    await page.goto("/enregistres/");
    await page.reload();
    await expect(page.getByRole("link", { name: /L'inflation expliquée simplement/ })).toBeVisible();
    await page.getByRole("button", { name: "Tout effacer" }).click();
    await expect(page.getByText("Rien d'enregistré pour l'instant")).toBeVisible();
  });

  test("la navigation principale mène à chaque section", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navigation principale" }).locator("visible=true");
    const targets: [string, RegExp][] = [
      ["Explorer", /\/explorer\/$/],
      ["Réviser", /\/reviser\/$/],
      ["Enregistrés", /\/enregistres\/$/],
      ["Mes sujets", /\/mes-sujets\/$/],
      ["Fil", /\/$/],
    ];
    for (const [label, url] of targets) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(url);
      await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    }
    expect(isMobile(page) ? "mobile" : "desktop").toBeTruthy();
  });

  test("une page de récit montre son média avec crédits", async ({ page }) => {
    await page.goto("/recit/recycler-une-batterie/");
    await expect(page.getByRole("img", { name: /batterie usagée est broyée/ })).toBeVisible();
    await expect(page.getByText("Création originale, droits détenus par MUNDI")).toBeVisible();
  });
});
