import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";

const articles = (JSON.parse(readFileSync("content/publications.json", "utf8")) as
 { slug: string; status: string }[]).filter((a) => a.status === "published");

test("mobile and desktop: audio reads short chunks, finishes, and resets its button", async ({ page }) => {
  const article = articles[0];
  test.skip(!article, "No published article");
  await page.goto("/actualites/" + article.slug + "/");
  const listen = page.getByRole("button", { name: "Écouter le résumé" });
  await listen.click();
  await expect(page.getByRole("button", { name: "Arrêter la lecture audio" })).toHaveAttribute("aria-pressed", "true");
  const first = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
  expect(first.length).toBe(1);
  expect(first[0].length).toBeLessThanOrEqual(240);

  await page.evaluate(() => {
    const synth = window.speechSynthesis as unknown as { speaking: boolean; finish: () => void };
    for (let i = 0; i < 40 && synth.speaking; i++) synth.finish();
  });
  const passages = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
  expect(passages.length).toBeGreaterThan(1);
  expect(passages.every((x) => x.length <= 240)).toBe(true);
  expect(passages.join(" ")).toContain("Trois points à retenir");
  await expect(page.getByRole("button", { name: "Écouter le résumé" })).toHaveAttribute("aria-pressed", "false");
});

test("unsupported speech reports a useful message and offers retry, rather than silent play", async ({ page }) => {
  const article = articles[0];
  test.skip(!article, "No published article");
  await page.goto("/actualites/" + article.slug + "/");
  await page.evaluate(() => {
    const synth = window.speechSynthesis as unknown as { speak: (u: SpeechSynthesisUtterance) => void };
    synth.speak = (u: SpeechSynthesisUtterance) => {
      queueMicrotask(() => u.onerror?.({ error: "not-allowed" } as SpeechSynthesisErrorEvent));
    };
  });
  await page.getByRole("button", { name: "Écouter le résumé" }).click();
  await expect(page.getByRole("status")).toContainText("navigateur a refusé");
  await expect(page.getByRole("button", { name: "Écouter le résumé" })).toContainText("Réessayer");
});

test("navigating away from a speaking feed card does not leave its button active", async ({ page }) => {
  await page.goto("/");
  const first = page.locator('[data-index="0"]');
  const button = first.getByRole("button", { name: "Écouter le résumé" });
  await button.click();
  await expect(first.getByRole("button", { name: "Arrêter la lecture audio" })).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-index="1"]').scrollIntoViewIfNeeded();
  await expect(first.getByRole("button", { name: "Écouter le résumé" })).toHaveAttribute("aria-pressed", "false");
});
