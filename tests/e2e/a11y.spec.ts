import AxeBuilder from "@axe-core/playwright";
import { expect, isMobile, scrollFeedTo, test } from "./fixtures";

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

  test("la touche Espace met en pause la vidéo visible", async ({ page }) => {
    test.skip(isMobile(page), "Clavier physique : ordinateur");
    await page.goto("/");
    const index = await page.locator('[data-story="equilibre-reseau-electrique"]').first().evaluate((el) => Number((el as HTMLElement).dataset.index));
    await scrollFeedTo(page, index);
    const video = page.locator(`[data-index="${index}"] video`);
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 10_000 }).toBe(true);
    await page.locator("body").focus();
    await page.keyboard.press(" ");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  });

  test("les commandes vidéo sont atteignables au clavier et nommées", async ({ page }) => {
    await page.goto("/");
    const index = await page.locator('[data-story="equilibre-reseau-electrique"]').first().evaluate((el) => Number((el as HTMLElement).dataset.index));
    await scrollFeedTo(page, index);
    const card = page.locator(`[data-index="${index}"]`);
    const toggle = card.getByRole("button", { name: /la vidéo/ });
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(card.getByRole("button", { name: /sous-titres/ })).toBeFocused();
  });

  test("le fichier de sous-titres est un WebVTT valide en français", async ({ request }) => {
    for (const name of ["reseau-electrique", "detroit"]) {
      const res = await request.get(`/media/demo/${name}.fr.vtt`);
      expect(res.headers()["content-type"]).toContain("text/vtt");
      const text = await res.text();
      expect(text.startsWith("WEBVTT")).toBe(true);
      expect((text.match(/-->/g) ?? []).length).toBeGreaterThanOrEqual(3);
    }
  });

  for (const path of ["/", "/explorer/", "/recit/equilibre-reseau-electrique/", "/application/", "/a-propos/", "/confidentialite/", "/hors-ligne/"]) {
    test(`contrastes et règles WCAG A/AA : ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(500);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const summary = results.violations.map((v) => `${v.id} (${v.nodes.length}) : ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
      expect(summary, "violations axe").toEqual([]);
    });
  }
});
