import { expect, scrollFeedTo, test } from "./fixtures";

const firstScreenOf = (page: import("@playwright/test").Page, slug: string) =>
  page.locator(`[data-story="${slug}"]`).first().evaluate((el) => Number((el as HTMLElement).dataset.index));

test.describe("Réseau mobile lent et chargement progressif", () => {
  test("sur réseau lent, le premier écran s'affiche et seuls les médias proches sont chargés", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Limitation du débit disponible seulement avec Chromium");
    test.setTimeout(90_000); // Slow-3G networkidle may legitimately exceed the default 30s test timeout.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    // Profil « 3G lente » : 400 kbit/s, 400 ms de latence.
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 50_000, uploadThroughput: 50_000 });
    const media: string[] = [];
    let bytes = 0;
    page.on("requestfinished", async (req) => {
      const url = new URL(req.url());
      if (url.pathname.startsWith("/media/")) media.push(url.pathname);
      const sizes = await req.sizes().catch(() => null);
      if (sizes) bytes += sizes.responseBodySize;
    });
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-index="0"] h2, [data-index="0"] p').first()).toBeVisible({ timeout: 30_000 });
    const firstScreenMs = Date.now() - start;
    const fcp = await page.evaluate(() => Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? -1));
    await page.waitForLoadState("networkidle", { timeout: 60_000 });
    test.info().annotations.push({ type: "mesure", description: `1er affichage (FCP) ${fcp} ms, texte du 1er écran ${firstScreenMs} ms, ${Math.round(bytes / 1024)} Ko transférés` });
    // Garde-fou large : sur 3G lente, le premier affichage doit rester sous 5 s.
    expect(fcp).toBeGreaterThan(0);
    expect(fcp).toBeLessThan(5_000);
    // Aucune vidéo du fil n'est loin de l'écran au départ : aucune ne doit être téléchargée.
    expect(media.filter((m) => /\.(mp4|webm)$/.test(m))).toEqual([]);
    expect(media.some((m) => m.includes("detroit"))).toBe(false);
  });

  test("en mode économie de données, la vidéo attend un geste de la personne", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: Object.assign(new EventTarget(), { saveData: true, effectiveType: "4g" }),
      });
    });
    await page.goto("/");
    const index = await firstScreenOf(page, "equilibre-reseau-electrique");
    await scrollFeedTo(page, index);
    const card = page.locator(`[data-index="${index}"]`);
    await expect(card.getByTestId("save-data-note")).toBeVisible();
    await expect(card.locator("video source")).toHaveCount(0);
    await page.waitForTimeout(800);
    expect(await card.locator("video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await card.getByRole("button", { name: "Lire la vidéo" }).click();
    await expect(card.locator("video source")).toHaveCount(2);
    await expect.poll(() => card.locator("video").evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 10_000 }).toBe(true);
  });
});

test.describe("Erreurs de médias", () => {
  test.use({ allowedErrors: /Failed to load resource|net::ERR_FAILED/ });

  test("une vidéo indisponible affiche l'aperçu, un message et ne bloque pas le fil", async ({ page }) => {
    let blocked = true;
    await page.route(/\/media\/demo\/reseau-electrique\.(mp4|webm)$/, (route) => (blocked ? route.abort() : route.continue()));
    await page.goto("/");
    const index = await firstScreenOf(page, "equilibre-reseau-electrique");
    await scrollFeedTo(page, index);
    const card = page.locator(`[data-index="${index}"]`);
    await expect(card.getByRole("status")).toContainText("Vidéo indisponible");
    await expect(card.locator('[data-state="error"] img')).toBeVisible();
    // Le texte du récit reste lisible et le fil continue.
    await expect(card.getByText("L'accroche")).toBeVisible();
    await scrollFeedTo(page, index + 1);
    await scrollFeedTo(page, index);
    // Réessayer quand le réseau revient.
    blocked = false;
    await card.getByRole("button", { name: "Réessayer" }).click();
    await expect.poll(() => card.locator("video").evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 10_000 }).toBe(true);
  });

  test("si la vidéo et son aperçu manquent, le visuel de secours s'affiche", async ({ page }) => {
    await page.route(/\/media\/demo\/reseau-electrique[^/]*$/, (route) => route.abort());
    await page.goto("/");
    const index = await firstScreenOf(page, "equilibre-reseau-electrique");
    await scrollFeedTo(page, index);
    const card = page.locator(`[data-index="${index}"]`);
    await expect(card.getByRole("status")).toContainText("Vidéo indisponible");
    await expect(card.locator('[data-state="error"] svg').first()).toBeVisible();
  });

  test("une illustration indisponible est remplacée sans casser la carte", async ({ page }) => {
    await page.route(/\/media\/demo\/correlation\.jpg$/, (route) => route.abort());
    await page.goto("/");
    const card = page.locator('[data-story="correlation-causalite"]').first();
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByRole("status")).toContainText("Illustration indisponible");
    await expect(card.getByText("L'accroche")).toBeVisible();
  });
});
