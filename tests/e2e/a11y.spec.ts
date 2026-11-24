import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

test.describe("Accessibilité", () => {
  test("le lien « Aller au contenu » est le premier élément au clavier", async ({ page }) => {
    await page.goto("/explorer/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Aller au contenu" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#contenu$/);
  });

  for (const path of ["/", "/explorer/", "/reviser/", "/application/", "/a-propos/", "/confidentialite/", "/hors-ligne/"]) {
    test(`contrastes et règles WCAG A/AA : ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(500);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const summary = results.violations.map((v) => `${v.id} (${v.nodes.length}) : ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
      expect(summary, "violations axe").toEqual([]);
    });
  }
});
