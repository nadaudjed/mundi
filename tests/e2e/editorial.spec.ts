import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

const ARTICLE = "/actualites/dechets-textiles-europe-2024-23-millions-tonnes/";

test.describe("Direction éditoriale numérique", () => {
  test("article : chiffre clé en couverture, graphique sourcé, carte mémoire vers Réviser", async ({ page }) => {
    await page.goto(ARTICLE);
    // Article du pilote « Aujourd'hui » : le chiffre clé est dans « L'essentiel ».
    await expect(page.locator('[data-testid="cover-key-figure"], [data-testid="figures"]').first()).toContainText("2,3");
    const chart = page.getByTestId("chart");
    await expect(chart).toHaveCount(1);
    await expect(chart.getByRole("img")).toHaveAttribute("aria-label", /Déchets textiles générés : 2,3/);
    await expect(chart.getByRole("link", { name: /Eurostat/ })).toHaveAttribute("href", /eurostat/);
    const card = page.getByTestId("memory-card");
    await expect(card.getByRole("heading", { name: "Trois idées à retenir" })).toBeVisible();
    await expect(card.locator("li")).toHaveCount(3);
    await expect(card.getByRole("link", { name: "Réviser ces idées" })).toHaveAttribute("href", "/reviser/");
  });

  test("barre de progression de lecture : avance avec le défilement", async ({ page }) => {
    await page.goto(ARTICLE);
    const bar = page.getByTestId("reading-progress");
    await expect(bar).toHaveAttribute("aria-valuenow", "0");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(async () => Number(await bar.getAttribute("aria-valuenow"))).toBeGreaterThan(90);
  });

  test("graphique complet d'emblée quand le lecteur réduit les animations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(ARTICLE);
    const bar = page.getByTestId("chart").locator("rect.chart-bar").first();
    await bar.scrollIntoViewIfNeeded();
    const box = await bar.boundingBox();
    expect(box!.height).toBeGreaterThan(20);
  });

  test("recherche au clavier : « / » et Ctrl+K ouvrent la recherche", async ({ page }) => {
    await page.goto("/reviser/");
    await page.locator("body").press("/");
    await expect(page).toHaveURL(/\/explorer\/$/);
    await expect(page.getByRole("searchbox")).toBeFocused();
    await page.getByRole("searchbox").blur();
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("searchbox")).toBeFocused();
  });

  test("mode sombre : suit l'appareil, bascule manuelle mémorisée sur l'appareil", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/mes-sujets/");
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(await bg()).toBe("rgb(14, 21, 33)");
    await page.locator("#contenu").getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await bg()).toBe("rgb(243, 240, 232)");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await page.evaluate(() => localStorage.getItem("mundi:theme"))).toBe("light");
  });

  for (const path of ["/explorer/", ARTICLE, "/reviser/", "/mes-sujets/"]) {
    test(`mode sombre : contrastes WCAG AA sur ${path}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
    });
  }
});
