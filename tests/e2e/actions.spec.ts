import { readFileSync } from "node:fs";
import { expect, isMobile, test } from "./fixtures";

const first = (JSON.parse(readFileSync("content/publications.json", "utf8")) as { slug: string; title: string; status: string }[])
  .filter((p) => p.status === "published")[0];

test.describe("Écoute, sauvegarde et navigation", () => {
  test("le bouton Écouter lit le résumé avec la voix de l'appareil, puis s'arrête", async ({ page }) => {
    await page.goto("/");
    const card = page.locator('[data-index="0"]');
    const listen = card.getByRole("button", { name: "Écouter le résumé" });
    await listen.click();
    await expect(card.getByRole("button", { name: "Mettre en pause la lecture audio" })).toHaveAttribute("aria-pressed", "true");
    const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toContain(first.title.slice(0, 20));
    // A device may read a story in several shorter utterances to avoid
    // intermittent iOS/Android speech stalls. Drain every synthetic chunk.
    await page.evaluate(() => {
      const synth = window.speechSynthesis as unknown as { speaking: boolean; finish: () => void };
      for (let i = 0; i < 40 && synth.speaking; i++) synth.finish();
    });
    const completeSpeech = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.join(" "));
    expect(completeSpeech).toContain("Trois points à retenir");
    await expect(card.getByRole("button", { name: "Écouter le résumé" })).toHaveAttribute("aria-pressed", "false");
  });

  test("enregistrer une publication la fait apparaître dans Enregistrés, même après rechargement", async ({ page }) => {
    await page.goto(`/actualites/${first.slug}/`);
    await page.locator("#contenu").getByRole("button", { name: /^Enregistrer « / }).first().click();
    await expect(page.getByRole("status").filter({ hasText: "Enregistré" }).first()).toBeVisible();
    await page.goto("/enregistres/");
    await page.reload();
    await expect(page.getByRole("link", { name: first.title })).toBeVisible();
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
});
