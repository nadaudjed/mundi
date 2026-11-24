import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";

/**
 * Voix de l'appareil (secours) : testée sur le site de test, avec un article SANS
 * version audio enregistrée (tests/fixtures/article-audio.fixture.json n'en liste qu'un).
 */
const FIXTURES = `http://localhost:${Number(process.env.E2E_PORT ?? 4173) + 1}`;
const audioManifest = JSON.parse(readFileSync("tests/fixtures/article-audio.fixture.json", "utf8")) as Record<string, unknown>;
const articles = (JSON.parse(readFileSync("tests/fixtures/publications.fixture.json", "utf8")) as
 { slug: string }[]).filter((a) => !audioManifest[a.slug]);

test("mobile and desktop: audio reads short chunks, finishes, and resets its button", async ({ page }) => {
  const article = articles[0];
  test.skip(!article, "Aucun article de test sans audio");
  await page.goto(FIXTURES + "/actualites/" + article.slug + "/");
  const listen = page.getByRole("button", { name: "Écouter le résumé" });
  await listen.click();
  await expect(page.getByRole("button", { name: "Mettre en pause la lecture audio" })).toHaveAttribute("aria-pressed", "true");
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
  test.skip(!article, "Aucun article de test sans audio");
  await page.goto(FIXTURES + "/actualites/" + article.slug + "/");
  await page.evaluate(() => {
    const synth = window.speechSynthesis as unknown as { speak: (u: SpeechSynthesisUtterance) => void };
    synth.speak = (u: SpeechSynthesisUtterance) => {
      queueMicrotask(() => u.onerror?.({ error: "audio-busy" } as SpeechSynthesisErrorEvent));
    };
  });
  await page.getByRole("button", { name: "Écouter le résumé" }).click();
  await expect(page.getByRole("status").filter({ hasText: "sortie audio est occupée" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Écouter le résumé" })).toContainText("Réessayer");
});

test("navigating away from a speaking feed card does not leave its button active", async ({ page }) => {
  await page.goto("/");
  const first = page.locator('[data-index="0"]');
  const button = first.getByRole("button", { name: "Écouter le résumé" });
  await button.click();
  await expect(first.getByRole("button", { name: "Mettre en pause la lecture audio" })).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-index="1"]').scrollIntoViewIfNeeded();
  await expect(first.getByRole("button", { name: "Écouter le résumé" })).toHaveAttribute("aria-pressed", "false");
});

type Spy = { __spoken: string[] };
const spoken = (page: import("@playwright/test").Page) => page.evaluate(() => (window as unknown as Spy).__spoken.slice());

test("pause puis reprise : la voix repart du passage en cours, et Arrêter remet le bouton à zéro", async ({ page }) => {
  const article = articles[0];
  test.skip(!article, "Aucun article de test sans audio");
  await page.goto(FIXTURES + "/actualites/" + article.slug + "/");
  await page.getByRole("button", { name: "Écouter le résumé" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Lecture en cours" })).toHaveCount(1);
  await page.evaluate(() => (window.speechSynthesis as unknown as { finish: () => void }).finish());
  const before = await spoken(page);
  expect(before).toHaveLength(2);

  await page.getByRole("button", { name: "Mettre en pause la lecture audio" }).click();
  await expect(page.getByRole("status").filter({ hasText: "En pause" })).toHaveCount(1);
  expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(false);

  await page.getByRole("button", { name: "Reprendre la lecture audio" }).click();
  await expect(page.getByRole("button", { name: "Mettre en pause la lecture audio" })).toBeVisible();
  const after = await spoken(page);
  expect(after).toHaveLength(3);
  expect(after[2]).toBe(before[1]);

  await page.getByRole("button", { name: "Arrêter la lecture audio" }).click();
  await expect(page.getByRole("button", { name: "Écouter le résumé" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Arrêter la lecture audio" })).toHaveCount(0);
});

test("moteur vocal figé (iPhone) : la lecture est relancée automatiquement une fois", async ({ page }) => {
  const article = articles[0];
  test.skip(!article, "Aucun article de test sans audio");
  await page.goto(FIXTURES + "/actualites/" + article.slug + "/");
  await page.evaluate(() => {
    const synth = window.speechSynthesis as unknown as { speak: (u: SpeechSynthesisUtterance) => void };
    const real = synth.speak.bind(synth);
    let first = true;
    // Le premier appel est ignoré en silence, comme Safari après un cancel().
    synth.speak = (u: SpeechSynthesisUtterance) => {
      if (first) { first = false; (window as unknown as Spy).__spoken.push("(ignoré)"); return; }
      real(u);
    };
  });
  await page.getByRole("button", { name: "Écouter le résumé" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Lecture en cours" })).toHaveCount(1, { timeout: 6000 });
  const s = await spoken(page);
  expect(s[0]).toBe("(ignoré)");
  expect(s).toHaveLength(2);
});

test("écouter une deuxième carte arrête la première", async ({ page }) => {
  await page.goto("/");
  // Les cartes de données s'intercalent : on prend les deux premières publications.
  const cards = page.getByTestId("verified-card");
  const first = cards.nth(0);
  await first.getByRole("button", { name: "Écouter le résumé" }).click();
  await expect(first.getByRole("button", { name: "Mettre en pause la lecture audio" })).toBeVisible();
  const second = cards.nth(1);
  await second.scrollIntoViewIfNeeded();
  await second.getByRole("button", { name: "Écouter le résumé" }).click();
  await expect(second.getByRole("button", { name: "Mettre en pause la lecture audio" })).toBeVisible();
  await expect(first.getByRole("button", { name: "Écouter le résumé" })).toHaveAttribute("aria-pressed", "false");
});
