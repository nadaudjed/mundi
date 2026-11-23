import { expect, scrollFeedTo, test } from "./fixtures";

const VIDEO_STORY = "equilibre-reseau-electrique";

async function firstScreenOf(page: import("@playwright/test").Page, slug: string) {
  return page.locator(`[data-story="${slug}"]`).first().evaluate((el) => Number((el as HTMLElement).dataset.index));
}

test.describe("Médias immersifs", () => {
  test("la vidéo reste muette, se lit quand elle est visible et se met en pause", async ({ page }) => {
    await page.goto("/");
    const index = await firstScreenOf(page, VIDEO_STORY);
    await scrollFeedTo(page, index);
    const card = page.locator(`[data-index="${index}"]`);
    const video = card.locator("video");

    // Chargement différé : la source n'est attachée qu'une fois la carte proche.
    await expect(video.locator("source")).toHaveCount(2);
    await expect(video).toHaveJSProperty("muted", true);
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 10_000 }).toBe(true);
    // Pas de piste son dans ces démonstrations : aucun bouton « Activer le son ».
    await expect(card.getByRole("button", { name: "Activer le son" })).toHaveCount(0);

    await card.getByRole("button", { name: "Mettre la vidéo en pause" }).click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await card.getByRole("button", { name: "Lire la vidéo" }).click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);

    // En quittant la carte, la vidéo s'arrête.
    await scrollFeedTo(page, index + 1);
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  });

  test("les sous-titres s'affichent et peuvent être masqués", async ({ page }) => {
    await page.goto("/");
    const index = await firstScreenOf(page, VIDEO_STORY);
    await scrollFeedTo(page, index);
    const card = page.locator(`[data-index="${index}"]`);
    await expect(card.locator("track[kind=captions]")).toHaveAttribute("srclang", "fr");
    await expect(card.getByText("production doit égaler la consommation")).toBeVisible({ timeout: 10_000 });
    await card.getByRole("button", { name: "Masquer les sous-titres" }).click();
    await expect(card.getByText("production doit égaler la consommation")).toHaveCount(0);
  });

  test("les cartes éloignées ne chargent pas leurs médias", async ({ page }) => {
    await page.goto("/");
    const index = await firstScreenOf(page, VIDEO_STORY);
    expect(index).toBeGreaterThan(1);
    await expect(page.locator(`[data-index="${index}"] video source`)).toHaveCount(0);
  });

  test("chaque média affiche ses crédits (auteur, licence, provenance)", async ({ page }) => {
    await page.goto("/");
    const card = page.locator('[data-story="correlation-causalite"]').first();
    await card.scrollIntoViewIfNeeded();
    const credit = card.getByRole("button", { name: /©/ });
    await credit.click();
    const panel = card.getByRole("region", { name: "Crédits du média" });
    await expect(panel).toContainText("Auteur");
    await expect(panel).toContainText("Licence");
    await expect(panel).toContainText("Provenance");
  });

  test("le chargement des médias de démonstration ne renvoie aucune erreur", async ({ page }) => {
    const failures: string[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/media/") && r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
    });
    await page.goto("/");
    const start = await firstScreenOf(page, "equilibre-reseau-electrique");
    for (let i = start; i < start + 6; i++) await scrollFeedTo(page, i);
    expect(failures).toEqual([]);
  });
});

test.describe("Réduction des animations", () => {
  test.use({ reducedMotion: "reduce" });

  test("la vidéo ne démarre pas toute seule", async ({ page }) => {
    await page.goto("/");
    const index = await firstScreenOf(page, VIDEO_STORY);
    await scrollFeedTo(page, index);
    const video = page.locator(`[data-index="${index}"] video`);
    await page.waitForTimeout(1500);
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await page.locator(`[data-index="${index}"]`).getByRole("button", { name: "Lire la vidéo" }).click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
  });
});
