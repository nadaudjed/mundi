import { expect, test } from "@playwright/test";

/** Accueil en défilement naturel (ticket #113) : 1 sujet principal, 2 secondaires, puis les dernières publications. */
test.describe("Accueil", () => {
  test("une édition courte : format, titre, enjeu et une action pour chaque sujet", async ({ page }) => {
    await page.goto("/");
    const topics = page.getByTestId("home-topic");
    await expect(topics).toHaveCount(3);
    for (const topic of await topics.all()) {
      await expect(topic.getByTestId("home-format")).not.toBeEmpty();
      await expect(topic.getByRole("heading")).not.toBeEmpty();
      await expect(topic.getByTestId("home-stake")).not.toBeEmpty();
      await expect(topic.getByTestId("home-action")).toHaveCount(1);
    }
    // Le sujet principal est visible sans défiler et s'ouvre d'un appui.
    await expect(topics.first().getByRole("heading", { level: 2 })).toBeInViewport();
    const href = await topics.first().getByTestId("home-action").getAttribute("href");
    await topics.first().getByTestId("home-action").click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/#.*$/, "").replace(/[/]/g, "\\/")));
  });

  test("pas de doublon, premier lot dans la page, lots suivants à la demande", async ({ page, request }) => {
    const html = await (await request.get("/")).text();
    // Page légère : bien moins d'articles qu'avant (110 sur l'ancien fil plein écran).
    expect((html.match(/<article/g) ?? []).length).toBeLessThanOrEqual(3);
    await page.goto("/");
    const top = await page.getByTestId("home-topic").evaluateAll((els) => els.map((e) => e.getAttribute("data-publication")));
    const rows = page.getByTestId("home-latest-item");
    await expect(rows).toHaveCount(12);
    const { items } = (await (await request.get("/accueil.json")).json()) as { items: { slug: string }[] };
    const total = items.filter((i) => !top.includes(i.slug)).length;
    await expect(page.getByTestId("home-latest-count")).toHaveText(`12 sur ${total} publications`);
    await page.getByTestId("home-more").click();
    await expect(rows).toHaveCount(Math.min(24, total));
    const all = [...top, ...(await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-publication"))))];
    expect(new Set(all).size, "aucune publication en double").toBe(all.length);
  });

  test("le retour arrière retrouve les lots ouverts et la position", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("home-more").click();
    const target = page.getByTestId("home-latest-item").nth(18);
    await target.scrollIntoViewIfNeeded();
    const slug = await target.getAttribute("data-publication");
    const before = await page.evaluate(() => window.scrollY);
    await target.getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/actualites/${slug}/`));
    await page.goBack();
    await expect(page.getByTestId("home-latest-item")).toHaveCount(24);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before - 80);
    await expect(page.locator(`[data-testid="home-latest-item"][data-publication="${slug}"]`)).toBeInViewport();
  });

  test("seule la première image est prioritaire ; le fil immersif reste accessible", async ({ page }) => {
    await page.goto("/");
    const photos = page.getByTestId("home-photo");
    if ((await photos.count()) > 0) {
      const loading = await photos.evaluateAll((els) => els.map((e) => (e as HTMLImageElement).loading));
      expect(loading.filter((l) => l === "eager").length).toBeLessThanOrEqual(1);
    }
    await page.getByTestId("home-immersive").click();
    await expect(page).toHaveURL(/\/fil\/$/);
    await expect(page.getByLabel("Fil de découverte")).toBeVisible();
  });

  test("320 px : pas de défilement horizontal, recherche et Mes sujets d'un appui", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, locale: "fr-FR" });
    const page = await ctx.newPage();
    await page.goto("http://localhost:" + (process.env.E2E_PORT ?? 4173) + "/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
    await expect(page.getByTestId("header-search")).toBeVisible();
    await expect(page.getByTestId("header-settings")).toBeVisible();
    await page.getByTestId("header-search").click();
    await expect(page).toHaveURL(/\/explorer\/$/);
    await ctx.close();
  });
});
