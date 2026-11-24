import { expect, test } from "./fixtures";

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
    // Seules les photos des cartes proches (la carte visible et ses deux voisines) sont téléchargées.
    const photos = new Set(media.filter((m) => m.startsWith("/media/editorial/")));
    expect(photos.size).toBeLessThanOrEqual(3);
  });
});
