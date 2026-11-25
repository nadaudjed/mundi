import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "./fixtures";

/** Préparation du lancement (ticket #37) : confidentialité, partage des liens, page 404. */

/** Toutes les clés « mundi:… » écrites dans le code de l'application. */
function keysInCode(): string[] {
  const found = new Set<string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(name)) for (const m of readFileSync(path, "utf8").matchAll(/["'`](mundi:[a-z0-9:-]+)["'`]/g)) found.add(m[1]);
    }
  };
  ["app", "components", "lib"].forEach(walk);
  return [...found].sort();
}

test("la page Confidentialité liste chaque donnée gardée sur l'appareil", async ({ page }) => {
  await page.goto("/confidentialite/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vos données restent sur votre appareil.");
  const listed = (await page.getByTestId("local-data").locator("dt").allTextContents()).sort();
  expect(listed).toEqual(keysInCode());
  await expect(page.getByText("Pas de cookie.")).toBeVisible();
});

test("« Effacer mes données » vide le stockage MUNDI de cet appareil", async ({ page }) => {
  await page.goto("/confidentialite/");
  await page.evaluate(() => {
    localStorage.setItem("mundi:topics:v1", JSON.stringify(["energie"]));
    localStorage.setItem("mundi:motion-paused", "1");
    localStorage.setItem("autre-site", "garder");
  });
  await page.getByRole("button", { name: "Effacer mes données MUNDI sur cet appareil" }).click();
  await page.getByRole("button", { name: "Oui, tout effacer" }).click();
  await page.waitForLoadState("load");
  await expect.poll(() => page.evaluate(() => [localStorage.getItem("mundi:topics:v1"), localStorage.getItem("mundi:motion-paused"), localStorage.getItem("autre-site")])).toEqual([null, null, "garder"]);
});

test("la page À propos mène à la page Confidentialité", async ({ page }) => {
  await page.goto("/a-propos/");
  await page.getByRole("link", { name: "Confidentialité" }).click();
  await expect(page).toHaveURL(/\/confidentialite\/$/);
});

test("partage : chaque page annonce un titre et une image (Open Graph)", async ({ page, request }) => {
  await page.goto("/fil/");
  const og = (p: string) => page.locator(`meta[property="${p}"]`).getAttribute("content");
  expect(await og("og:site_name")).toBe("MUNDI");
  expect(await og("og:locale")).toBe("fr_FR");
  const image = (await og("og:image"))!;
  expect(image).toMatch(/^https:\/\/.+\/og\/mundi\.png$/);
  expect(await og("og:image:width")).toBe("1200");
  expect(await page.locator('meta[name="twitter:card"]').getAttribute("content")).toBe("summary_large_image");
  // L'image existe bien sur le site.
  const res = await request.get("/og/mundi.png");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});

test("partage d'une publication vérifiée : son titre, son résumé et ses dates", async ({ page }) => {
  await page.goto("/actualites/");
  const href = await page.locator('a[href^="/actualites/"][href$="/"]').filter({ hasNotText: "Toutes" }).first().getAttribute("href");
  test.skip(!href, "aucune publication vérifiée sur ce site");
  await page.goto(href!);
  // Le titre affiché garde ses espaces insécables (« : », « ? ») ; le titre de partage a des espaces simples.
  const title = (await page.getByRole("heading", { level: 1 }).textContent())!.replace(/\u00a0/g, " ");
  const og = (p: string) => page.locator(`meta[property="${p}"]`).getAttribute("content");
  expect(await og("og:type")).toBe("article");
  expect(await og("og:title")).toBe(title);
  expect(await og("og:url")).toMatch(new RegExp(`${href!.replace(/\//g, "\\/")}$`));
  expect(await og("article:published_time")).toBeTruthy();
  expect(await og("og:image")).toMatch(/\/og\/mundi\.png$/);
});

test.describe("page introuvable", () => {
  // Le navigateur signale lui-même la réponse 404 dans la console : c'est attendu ici.
  test.use({ allowedErrors: /status of 404/ });

  test("une adresse inconnue affiche la page 404 avec un retour à l'accueil", async ({ page }) => {
  const res = await page.goto("/cette-page-n-existe-pas/");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Cette page n'existe pas" })).toBeVisible();
  await page.getByRole("link", { name: "Retour à l'accueil", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});
});
