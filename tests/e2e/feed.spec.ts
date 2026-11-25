import { expect, FIRST_FEED_INDEX, isMobile, test } from "./fixtures";

test.describe("Fil de découverte", () => {
  test("ne montre que des publications sourcées, sans démonstration", async ({ page }) => {
    await page.goto("/fil/");
    // Après l'édition « Aujourd'hui » (tests/e2e/today.spec.ts), le fil ordinaire.
    const first = page.locator(`[data-index="${FIRST_FEED_INDEX}"]`);
    await expect(first).toBeAttached();
    await expect(first).toHaveAttribute("data-testid", "verified-card");
    await expect(first).toContainText(/Contrôle IA, sans relecture humaine|Validation humaine/);
    await expect(first.getByText("Vérifié", { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("demo-divider")).toHaveCount(0);
    await expect(page.locator("[data-story]")).toHaveCount(0);
    await expect(page.getByText(/^Démo(nstration)?$/)).toHaveCount(0);
  });

  test("le défilement passe d'un écran à l'autre (molette et clavier)", async ({ page }) => {
    // Site de test : contenu court et stable. Sur le site normal, un long article publié
    // automatiquement fait d'abord défiler son propre texte, ce qui est voulu.
    await page.goto(`http://localhost:${Number(process.env.E2E_PORT ?? 4173) + 1}/fil/`);
    const feed = page.getByLabel("Fil de découverte");
    await feed.hover();
    await page.mouse.wheel(0, 900);
    await expect(page.locator('[data-index="1"]')).toBeInViewport({ ratio: 0.9 });
    if (!isMobile(page)) {
      await page.keyboard.press("ArrowDown");
      await expect(page.locator('[data-index="2"]')).toBeInViewport({ ratio: 0.9 });
      await page.keyboard.press("ArrowUp");
      await expect(page.locator('[data-index="1"]')).toBeInViewport({ ratio: 0.9 });
    }
  });

  test("le filtre par sujet ne garde que ce sujet", async ({ page }) => {
    await page.goto("/fil/");
    // Les sujets sont rangés derrière un seul bouton, sur tous les écrans.
    await page.getByRole("button", { name: /Choisir un sujet/ }).click();
    const group = page.getByRole("group", { name: "Filtrer le fil par sujet" });
    await group.getByRole("button", { name: "Énergie" }).click();
    await expect(group).toBeHidden();
    const cards = page.locator("[data-publication]");
    await expect(cards.first()).toBeVisible();
    const topics = await page.locator('[data-testid="verified-card"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.topic));
    expect(new Set(topics)).toEqual(new Set(["energie"]));
  });
});
