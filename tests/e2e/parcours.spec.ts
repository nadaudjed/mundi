import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";

/**
 * Recette des parcours de lecture (ticket #120), à 320 et 390 px :
 * ouvrir un sujet depuis l'accueil, trouver la source d'un chiffre, écouter / pause / reprise,
 * enregistrer puis retrouver dans Bibliothèque, lien partagé direct, clavier et texte agrandi.
 * Les cas qui demandent un vrai téléphone (écran verrouillé, Safari iPhone) sont listés dans
 * docs/RECETTE_PARCOURS.md.
 */
type P = { slug: string; title: string; status: string; kind?: string; sections?: unknown[] };
const published = (JSON.parse(readFileSync("content/publications.json", "utf8")) as P[]).filter((p) => p.status === "published");
const decryptages = readFileSync("content/decryptages.json", "utf8");
/** Un article au gabarit commun (pas un décryptage du pilote). */
const article = published.find((p) => (p.kind ?? "actualite") === "actualite" && !decryptages.includes(`"${p.slug}"`))!;

const overflow = (page: import("@playwright/test").Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

for (const width of [320, 390]) {
  test.describe(`${width} px`, () => {
    test.use({ viewport: { width, height: 740 }, isMobile: true, hasTouch: true });

    test("ouvrir un sujet depuis l'accueil, puis revenir au même endroit", async ({ page }) => {
      await page.goto("/");
      expect(await overflow(page)).toBeLessThanOrEqual(0);
      const row = page.getByTestId("home-latest-item").nth(5);
      await row.scrollIntoViewIfNeeded();
      const slug = await row.getAttribute("data-publication");
      await row.getByRole("link").click();
      await expect(page).toHaveURL(new RegExp(`/actualites/${slug}/$`));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await overflow(page)).toBeLessThanOrEqual(0);
      await page.goBack();
      await expect(page.locator(`[data-testid="home-latest-item"][data-publication="${slug}"]`)).toBeInViewport();
    });

    test("trouver les sources d'un article et ouvrir la première", async ({ page }) => {
      await page.goto(`/actualites/${article.slug}/`);
      await page.getByTestId("publication-meta").getByRole("link", { name: /sources$/ }).click();
      await expect(page).toHaveURL(/#sources$/);
      const first = page.getByTestId("source-item").first();
      await expect(first).toBeInViewport();
      await expect(first.getByRole("link")).toHaveAttribute("href", /^https:\/\//);
      await expect(first.getByRole("link")).toHaveAttribute("target", "_blank");
    });

    test("écouter, mettre en pause, reprendre, puis fermer le mini-lecteur", async ({ page }) => {
      await page.goto(`/actualites/${article.slug}/`);
      await page.locator("#contenu").getByRole("button", { name: "Écouter le résumé" }).first().click();
      const mini = page.getByTestId("mini-player");
      await expect(mini).toHaveAttribute("data-phase", "playing");
      // Le mini-lecteur tient dans l'écran et ne passe pas sous le dock (mesuré une fois son apparition terminée).
      await mini.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
      const box = (await mini.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      const dock = page.getByRole("navigation", { name: "Navigation principale" }).locator("visible=true").last();
      const dockBox = await dock.boundingBox();
      if (dockBox) expect(box.y + box.height).toBeLessThanOrEqual(dockBox.y + 1);
      await mini.getByRole("button", { name: "Pause du lecteur" }).click();
      await expect(mini).toHaveAttribute("data-phase", "paused");
      await mini.getByRole("button", { name: "Reprendre le lecteur" }).click();
      await expect(mini).toHaveAttribute("data-phase", "playing");
      // Navigation interne : la lecture continue.
      await page.getByRole("navigation", { name: "Navigation principale" }).locator("visible=true").getByRole("link", { name: "Explorer", exact: true }).click();
      await expect(page).toHaveURL(/\/explorer\/$/);
      await expect(mini).toHaveAttribute("data-phase", "playing");
      await mini.getByRole("button", { name: "Fermer le lecteur" }).click();
      await expect(mini).toHaveCount(0);
    });

    test("enregistrer un article puis le retrouver dans Bibliothèque", async ({ page }) => {
      await page.goto(`/actualites/${article.slug}/`);
      await page.locator("#contenu").getByRole("button", { name: /^Enregistrer « / }).first().click();
      await page.getByRole("navigation", { name: "Navigation principale" }).locator("visible=true").getByRole("link", { name: "Bibliothèque", exact: true }).click();
      await expect(page).toHaveURL(/\/enregistres\/$/);
      await page.getByRole("link", { name: article.title }).click();
      await expect(page).toHaveURL(new RegExp(`/actualites/${article.slug}/$`));
    });

    test("lien partagé direct : l'article s'ouvre tout de suite, sans animation d'entrée", async ({ page }) => {
      await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
      await page.goto(`/actualites/${article.slug}/`);
      await expect(page.locator(".intro")).toBeHidden();
      await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
    });

    test("texte agrandi à 200 % : aucune page ne déborde", async ({ page }) => {
      for (const path of ["/", `/actualites/${article.slug}/`, "/enregistres/", "/reviser/", "/explorer/"]) {
        await page.goto(path);
        await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
        expect(await overflow(page), path).toBeLessThanOrEqual(0);
      }
    });
  });
}

test("au clavier : aller au contenu, ouvrir un sujet, enregistrer et l'écouter", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeFocused();
  await page.keyboard.press("Enter");
  // Le premier sujet s'ouvre au clavier.
  const action = page.getByTestId("home-topic").first().getByTestId("home-action");
  await action.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto(`/actualites/${article.slug}/`);
  const save = page.locator("#contenu").getByRole("button", { name: /^Enregistrer « / }).first();
  await save.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Enregistré" }).first()).toBeVisible();
  const listen = page.locator("#contenu").getByRole("button", { name: "Écouter le résumé" }).first();
  await listen.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("mini-player")).toHaveAttribute("data-phase", "playing");
  await page.getByTestId("mini-player").getByRole("button", { name: "Pause du lecteur" }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("mini-player")).toHaveAttribute("data-phase", "paused");
});
