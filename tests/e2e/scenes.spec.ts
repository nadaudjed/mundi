import AxeBuilder from "@axe-core/playwright";
import {readFileSync} from "node:fs";
import { expect, scrollFeedTo, test } from "./fixtures";
const PHOTO_INDEX = JSON.parse(readFileSync("content/editorial-images.json","utf8")) as {slug:string}[];
const TEXTILES = "dechets-textiles-europe-2024-23-millions-tonnes";

/**
 * Scènes plein écran et transitions typographiques (ticket #30).
 * Le site de test utilise un registre de fonds INVENTÉ (tests/fixtures/scenes.fixture.json)
 * et un simple dégradé neutre (tests/fixtures/scenes/) : jamais publiés.
 * Les vrais décors de la direction artistique (PR #27) ne sont pas dans le dépôt.
 */
const PORT = Number(process.env.E2E_PORT ?? 4173);
const FIXTURES = `http://localhost:${PORT + 1}`;
const SCENE_STAT = 1; // carte « chiffre clé » avec fond (cadrage haut)
const SECOND = 5; // seconde publication, avec fond (cadrage bas)

const opacity = (el: Element) => Number(getComputedStyle(el).opacity);

test.describe("Site normal : fonds approuvés, sans médias de test", () => {
  test("le fil utilise des fonds MUNDI approuvés, mais aucun fond de test", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('[data-index="0"]')).toBeVisible();
    // The article has either its original approved abstract scenes, or a
    // credited Commons documentary illustration added after publication.
    const textiles = page.locator('[data-testid="verified-card"][data-publication="' + TEXTILES + '"]');
    if(PHOTO_INDEX.some(p=>p.slug===TEXTILES)){
      await expect(textiles.getByTestId("editorial-photo")).toHaveAttribute("data-image-source","wikimedia-commons");
      await expect(textiles.getByTestId("editorial-photo-credit")).toContainText("Photo d’illustration");
      await expect(textiles.getByTestId("editorial-photo-credit").getByRole("link",{name:/source Wikimedia Commons/i})).toHaveAttribute("href",/commons\.wikimedia\.org/);
    }else{
      await expect(page.getByTestId("scene-backdrop")).toHaveCount(5);
      await expect(textiles.getByTestId("scene-backdrop")).toHaveAttribute("data-backdrop", "fond-matiere");
    }
    expect((await request.get("/media/scenes/test-fond-neutre.svg")).status()).toBe(404);
    expect((await request.get("/media/scenes/fond-matiere.svg")).status()).toBe(200);
  });
});

test.describe("Site de test : scènes et transitions", () => {
  test.use({ baseURL: FIXTURES });

  test("une carte de données avec fond : décor plein écran, texte et chiffres en HTML", async ({ page }) => {
    await page.goto("/");
    await scrollFeedTo(page, SCENE_STAT);
    const card = page.locator(`[data-index="${SCENE_STAT}"]`);
    const scene = card.getByTestId("scene-backdrop");
    await expect(scene).toHaveAttribute("aria-hidden", "true");
    const image = scene.locator(".scene-image");
    expect(await image.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("/media/scenes/test-fond-neutre.svg");
    expect(await image.evaluate((el) => getComputedStyle(el).backgroundPosition)).toBe("50% 20%");
    // Le décor couvre tout l'écran de la carte.
    const [box, cardBox] = [await scene.boundingBox(), await card.boundingBox()];
    expect(box!.width).toBeGreaterThanOrEqual(cardBox!.width - 1);
    expect(box!.height).toBeGreaterThanOrEqual(cardBox!.height - 1);
    // Ton nuit imposé sur un fond ; le chiffre reste du texte, avec sa source et le crédit du fond.
    await expect(card.locator("[data-card-kind]")).toHaveAttribute("data-tone", "night");
    await expect(card.getByTestId("stat-value")).toContainText("1 234,5");
    await expect(card.getByTestId("data-footer")).toContainText("Source : Jeu de données fictif (test)");
    await expect(card.getByTestId("scene-credit")).toHaveText("Fond : Fond de test MUNDI (dégradé neutre) · Usage interne aux tests");
    // Le texte passe au-dessus du décor.
    const top = await card.getByTestId("stat-value").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return document.elementFromPoint(r.left + 4, r.top + r.height / 2)?.closest("[data-testid='scene-backdrop']") === null;
    });
    expect(top).toBe(true);
  });

  test("les mots du titre apparaissent seulement sur la scène active", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-motion='ready']")).toHaveCount(1);
    const firstTitle = page.locator('[data-index="0"] h2');
    await expect(firstTitle).toHaveAttribute("data-reveal", "on");
    await expect.poll(() => firstTitle.locator(".reveal-word").last().evaluate(opacity)).toBe(1);
    // Les espaces entre les mots restent visibles une fois le titre découpé.
    expect(await firstTitle.evaluate((el) => (el as HTMLElement).innerText.replace(/\s+/g, " ").trim())).toBe("Exemple de test : une publication vérifiée sur l'énergie");
    // Le titre reste une seule phrase pour les lecteurs d'écran.
    await expect(page.locator('[data-index="0"]').getByRole("heading", { name: "Exemple de test : une publication vérifiée sur l'énergie" })).toBeVisible();

    const second = page.locator(`[data-index="${SECOND}"] h2`);
    await expect(second).toHaveAttribute("data-reveal", "off");
    expect(await second.locator(".reveal-word").first().evaluate(opacity)).toBe(0);
    await scrollFeedTo(page, SECOND);
    await expect(second).toHaveAttribute("data-reveal", "on");
    await expect.poll(() => second.locator(".reveal-word").last().evaluate(opacity)).toBe(1);
    await expect.poll(() => page.locator(`[data-index="${SECOND}"] [data-fade]`).evaluate(opacity)).toBe(1);
    // En revenant en arrière, un texte déjà lu reste affiché.
    await scrollFeedTo(page, 0);
    expect(await second.locator(".reveal-word").first().evaluate(opacity)).toBe(1);
  });

  test("mouvement réduit : tout le texte est visible tout de suite, le décor est immobile", async ({ browser }) => {
    const context = await browser.newContext({ baseURL: FIXTURES, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("[data-motion='ready']")).toHaveCount(1);
    // Même une scène qui n'est pas encore à l'écran a son texte visible.
    expect(await page.locator(`[data-index="${SECOND}"] h2 .reveal-word`).first().evaluate(opacity)).toBe(1);
    expect(await page.locator(`[data-index="${SECOND}"] [data-fade]`).evaluate(opacity)).toBe(1);
    await scrollFeedTo(page, SECOND);
    const name = await page.locator(`[data-index="${SECOND}"] .scene-image`).evaluate((el) => getComputedStyle(el).animationName);
    expect(name).toBe("none");
    await context.close();
  });

  test("le décor bouge seulement sur la scène active, et le bouton Pause l'arrête durablement", async ({ page }) => {
    await page.goto("/");
    const inactive = page.locator(`[data-index="${SECOND}"] .scene-image`);
    expect(await inactive.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    await scrollFeedTo(page, SECOND);
    await expect.poll(() => inactive.evaluate((el) => getComputedStyle(el).animationName)).toBe("scene-drift");
    expect(await inactive.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("running");

    const toggle = page.locator(`[data-index="${SECOND}"]`).getByTestId("motion-toggle");
    await expect(toggle).toHaveText("Mettre le décor en pause");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveText("Reprendre le décor");
    expect(await inactive.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("paused");
    // Le filet décoratif s'arrête aussi : « pause » = plus aucun mouvement de décor.
    expect(await page.locator(`[data-index="${SECOND}"]`).getByTestId("scene-thread").evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("paused");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion-paused", "");
    await expect(page.getByTestId("motion-toggle").first()).toHaveAttribute("aria-pressed", "true");
  });

  test("clavier : flèches haut et bas passent d'une scène à l'autre", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-motion='ready']")).toHaveCount(1);
    await expect(page.locator('[data-index="0"]')).toBeInViewport({ ratio: 0.9 });
    await page.keyboard.press("ArrowDown");
    await expect(page.locator('[data-index="1"]')).toBeInViewport({ ratio: 0.9 });
    await page.keyboard.press("ArrowDown");
    await expect(page.locator('[data-index="2"]')).toBeInViewport({ ratio: 0.9 });
    await page.keyboard.press("ArrowUp");
    await expect(page.locator('[data-index="1"]')).toBeInViewport({ ratio: 0.9 });
  });

  test("écran étroit (320 px) : pas de défilement horizontal, sources visibles", async ({ browser }) => {
    const context = await browser.newContext({ baseURL: FIXTURES, viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto("/");
    for (const i of [SCENE_STAT, 4, SECOND]) {
      await scrollFeedTo(page, i);
      const card = page.locator(`[data-index="${i}"]`);
      expect(await card.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await scrollFeedTo(page, SCENE_STAT);
    await expect(page.locator(`[data-index="${SCENE_STAT}"]`).getByRole("link", { name: /Jeu de données fictif/ })).toBeInViewport();
    await context.close();
  });

  test("accessibilité : les scènes avec fond passent axe", async ({ page }) => {
    await page.goto("/");
    for (const i of [SCENE_STAT, 4, SECOND]) {
      await scrollFeedTo(page, i);
      await page.waitForTimeout(1300); // fin des révélations, pour mesurer le contraste final
      const results = await new AxeBuilder({ page }).include(`[data-index="${i}"]`).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    }
  });
});
