import { expect, isMobile, scrollFeedTo, test } from "./fixtures";

test.describe("Fil de découverte", () => {
  test("affiche d’abord le récit vérifié puis distingue les démonstrations", async ({ page }) => {
    await page.goto("/");
    const first = page.locator('[data-index="0"]');
    await expect(first).toBeVisible();
    await expect(first).toHaveAttribute("data-testid", "verified-card");
    await expect(first).toContainText(/Contrôle IA, sans relecture humaine|Validation humaine/);
    await expect(first.getByText("Vérifié", { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("demo-divider")).toHaveCount(1);
    await expect(page.locator("[data-story]")).not.toHaveCount(0);
  });

  test("le défilement passe d'un écran à l'autre (molette et clavier)", async ({ page }) => {
    // Site de test : contenu court et stable. Sur le site normal, un long article publié
    // automatiquement fait d'abord défiler son propre texte, ce qui est voulu.
    await page.goto(`http://localhost:${Number(process.env.E2E_PORT ?? 4173) + 1}/`);
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

  test("un récit narratif raconte une idée par écran : accroche, fait, explication", async ({ page }) => {
    await page.goto("/");
    const story = "correlation-causalite";
    const screens = page.locator(`[data-story="${story}"]`);
    await expect(screens).toHaveCount(3);
    await expect(screens.nth(0)).toContainText("L'accroche");
    await expect(screens.nth(1)).toContainText("Le fait");
    await expect(screens.nth(2)).toContainText("L'explication");
    // Le bouton « Comprendre » n'apparaît qu'au dernier écran.
    await expect(screens.nth(0).getByRole("link", { name: "Comprendre" })).toHaveCount(0);
    await expect(screens.nth(2).getByRole("link", { name: "Comprendre" })).toHaveCount(1);
  });

  test("ouvre la page d'un récit depuis le fil", async ({ page }) => {
    await page.goto("/");
    const index = await page.locator("[data-index]").evaluateAll((els) =>
      els.findIndex((el) => el.querySelector('a[href^="/recit/"]')),
    );
    await scrollFeedTo(page, index);
    const card = page.locator(`[data-index="${index}"]`);
    const title = (await card.getAttribute("aria-label"))!.split(" : ").slice(1).join(" : ");
    await card.getByRole("link", { name: "Comprendre" }).click();
    await expect(page).toHaveURL(/\/recit\/.+\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();
  });

  test("le filtre par sujet ne garde que ce sujet", async ({ page }) => {
    await page.goto("/");
    // Les sujets sont rangés derrière un seul bouton, sur tous les écrans.
    await page.getByRole("button", { name: /Choisir un sujet/ }).click();
    const group = page.getByRole("group", { name: "Filtrer le fil par sujet" });
    await group.getByRole("button", { name: "Énergie" }).click();
    await expect(group).toBeHidden();
    const stories = await page.locator("[data-story]").evaluateAll((els) => [...new Set(els.map((e) => (e as HTMLElement).dataset.story))]);
    expect(stories).toEqual(["equilibre-reseau-electrique"]);
  });
});
