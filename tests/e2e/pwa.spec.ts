import { expect, test } from "./fixtures";

test.describe("Application installable (PWA)", () => {
  test("le manifeste et les icônes sont valides", async ({ page, request }) => {
    await page.goto("/");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toBeTruthy();
    const res = await request.get(href!);
    expect(res.ok()).toBe(true);
    const manifest = await res.json();
    expect(manifest).toMatchObject({ name: expect.stringContaining("MUNDI"), short_name: "MUNDI", start_url: "/", display: "standalone", lang: "fr" });
    const sizes = manifest.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}:${i.purpose ?? "any"}`);
    expect(sizes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
    for (const icon of manifest.icons) {
      const r = await request.get(icon.src);
      expect(r.ok(), icon.src).toBe(true);
      expect(r.headers()["content-type"]).toContain("image/png");
    }
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /apple-touch-icon\.png/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#101D30");
  });

  test("le bouton Installer ouvre la fenêtre d'installation du navigateur", async ({ page }) => {
    await page.goto("/");
    // Attendre que l'application soit prête (le lien d'aide n'apparaît qu'une fois hydratée).
    await expect(page.getByRole("link", { name: "Installer" }).locator("visible=true")).toBeVisible();
    // Simule l'événement que Chrome envoie quand le site est installable.
    await page.evaluate(() => {
      const e = new Event("beforeinstallprompt", { cancelable: true }) as Event & Record<string, unknown>;
      (window as unknown as { __prompted: number }).__prompted = 0;
      e.prompt = async () => {
        (window as unknown as { __prompted: number }).__prompted++;
      };
      e.userChoice = Promise.resolve({ outcome: "accepted" });
      window.dispatchEvent(e);
    });
    const chip = page.getByRole("button", { name: "Installer" }).locator("visible=true");
    await chip.click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __prompted: number }).__prompted)).toBe(1);
    await expect(page.getByRole("status")).toContainText("installé");
  });

  test("sans fenêtre d'installation, la page d'aide explique la marche à suivre", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Installer" }).locator("visible=true").click();
    await expect(page).toHaveURL(/\/application\/$/);
    await expect(page.getByRole("heading", { name: /Sur iPhone ou iPad/ })).toBeVisible();
    await expect(page.getByText("ne fonctionne pas hors connexion")).toBeVisible();
    await expect(page.getByTestId("install-state")).toHaveAttribute("data-state", "manual");
  });
});

test.describe("Hors connexion", () => {
  // Hors ligne, le navigateur signale les ressources qu'il ne peut pas joindre : c'est attendu.
  test.use({ allowedErrors: /Failed to load resource|net::ERR_INTERNET_DISCONNECTED|net::ERR_FAILED|Failed to fetch/ });

  test("le service worker s'installe et affiche une page claire hors connexion", async ({ page, context }) => {
    await page.goto("/");
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(scope).toMatch(/\/$/);
    await page.reload(); // la page est désormais contrôlée par le service worker
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    await page.goto("/explorer/").catch(() => {});
    await expect(page.getByRole("heading", { name: "Vous êtes hors connexion" })).toBeVisible();
    await context.setOffline(false);
    await page.getByRole("link", { name: "Réessayer" }).click();
    await expect(page.locator('[data-index="0"]')).toBeVisible();
  });
});
