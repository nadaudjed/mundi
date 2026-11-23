import AxeBuilder from "@axe-core/playwright";
import { expect, scrollFeedTo, test } from "./fixtures";

/**
 * Publications vérifiées dans le fil immersif.
 *
 * Deux sites sont construits pour ces tests (scripts/build-e2e-sites.mjs) :
 * - le site normal : premier récit Eurostat approuvé le 23 novembre 2026 ;
 * - un site de test (port suivant) construit avec
 *   tests/fixtures/publications.fixture.json. Ces publications sont INVENTÉES,
 *   ne servent qu'ici et ne sont jamais déployées.
 */
const PORT = Number(process.env.E2E_PORT ?? 4173);
const FIXTURES = `http://localhost:${PORT + 1}`;
const FIRST = "test-publication-energie";
const SECOND = "test-publication-technologie";

test.describe("Site normal : première publication Eurostat approuvée", () => {
  test("le fil montre la vraie publication, quatre cartes, puis des démonstrations séparées", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-index="0"]')).toBeVisible();
    await expect(page.getByTestId("verified-card")).toHaveCount(1);
    await expect(page.getByTestId("data-card")).toHaveCount(4);
    await expect(page.getByTestId("demo-divider")).toHaveCount(1);
    await expect(page.locator('[data-index="0"]')).toHaveAttribute("data-publication", "dechets-textiles-europe-2024-23-millions-tonnes");
    await expect(page.getByTestId("verified-count")).toHaveText("1 publication vérifiée disponible.");
  });

  test("aucune donnée de test n'est présente dans le site publié", async ({ page, request }) => {
    await page.goto("/actualites/");
    await expect(page.getByRole("link", { name: /déchets textiles/i }).first()).toBeVisible();
    const first = await request.get("/actualites/dechets-textiles-europe-2024-23-millions-tonnes/");
    expect(first.status()).toBe(200);
    const res = await request.get(`/actualites/${FIRST}/`);
    expect(res.status()).toBe(404);
    const html = await (await request.get("/")).text();
    expect(html).not.toContain("test-publication");
    expect(html).not.toContain("sources.mundi.test");
  });
});

test.describe("Site de test : publications inventées approuvées", () => {
  test.use({ baseURL: FIXTURES });

  test("les publications vérifiées ouvrent le fil, puis un écran sépare les démonstrations", async ({ page }) => {
    // La première publication est suivie de ses 4 cartes de données (tests/e2e/data-cards.spec.ts).
    await page.goto("/");
    const cards = page.getByTestId("verified-card");
    await expect(cards).toHaveCount(2);
    // Ordre : la plus récente d'abord.
    await expect(page.locator('[data-index="0"]')).toHaveAttribute("data-publication", FIRST);
    for (const i of [1, 2, 3, 4]) await expect(page.locator(`[data-index="${i}"]`)).toHaveAttribute("data-testid", "data-card");
    await expect(page.locator('[data-index="5"]')).toHaveAttribute("data-publication", SECOND);
    await expect(page.locator('[data-index="6"]')).toHaveAttribute("data-testid", "demo-divider");
    await expect(page.locator('[data-index="7"]')).toHaveAttribute("data-story", /.+/);

    const first = page.locator('[data-index="0"]');
    await expect(first.getByText("Vérifié", { exact: true })).toBeVisible();
    await expect(first.getByText("Exemple de test", { exact: true })).toBeVisible();
    await expect(first.getByTestId("verified-meta")).toContainText("Publié le 20 novembre 2026");
    await expect(first.getByTestId("verified-meta")).toContainText("actualisé le 21 novembre 2026");
    await expect(first.getByTestId("verified-meta")).toContainText("relu par Relecteur fictif (test)");
    await expect(first.locator("time").first()).toHaveAttribute("datetime", "2026-11-20");
    // Aucune mention « Contenu illustratif » sur une publication vérifiée.
    await expect(first.getByText("illustratif")).toHaveCount(0);
  });

  test("une publication automatique dit clairement qu'elle n'a pas été relue par un humain", async ({ page }) => {
    await page.goto("/");
    const card = page.locator(`[data-publication="${SECOND}"]`);
    await expect(card.getByTestId("verified-meta")).toContainText("vérifié par l'IA, sans relecture humaine");
    await expect(card.getByTestId("verified-meta")).not.toContainText("relu par");
    await page.goto(`/actualites/${SECOND}/`);
    await expect(page.getByTestId("ai-verified")).toHaveText("vérification automatique par l'IA MUNDI, sans relecture humaine");
    // Une publication relue par une personne garde sa mention habituelle.
    await page.goto(`/actualites/${FIRST}/`);
    await expect(page.getByTestId("ai-verified")).toHaveCount(0);
  });

  test("les sources restent visibles et cliquables dans la carte immersive", async ({ page }) => {
    await page.goto("/");
    const sources = page.locator('[data-index="0"]').getByTestId("verified-sources");
    const links = sources.getByRole("link", { name: /Source fictive/ });
    await expect(links).toHaveCount(3);
    await expect(links.first()).toHaveAttribute("href", "https://sources.mundi.test/a");
    await expect(links.first()).toHaveAttribute("target", "_blank");
    await expect(links.first()).toHaveAttribute("rel", /noopener/);
    // La 4e source est accessible depuis la page complète.
    await expect(sources.getByRole("link", { name: "+ 1 autre" })).toHaveAttribute("href", `/actualites/${FIRST}/`);
  });

  test("une carte sans fond affiche le motif génératif ; une carte avec fond approuvé affiche la scène", async ({ page }) => {
    await page.goto("/");
    const first = page.locator('[data-index="0"]');
    await expect(first.getByTestId("verified-credit")).toHaveText("Visuel : motif génératif MUNDI");
    await expect(first.locator('[data-visual="motif"]')).toHaveAttribute("aria-hidden", "true");
    await expect(first.locator("video, img")).toHaveCount(0);
    // La seconde publication demande un fond du registre (fond de test neutre, tests/fixtures/scenes/).
    const second = page.locator('[data-index="5"]');
    await expect(second.getByTestId("scene-backdrop")).toHaveAttribute("data-backdrop", "test-fond-neutre");
    await expect(second.getByTestId("scene-backdrop")).toHaveAttribute("aria-hidden", "true");
    await expect(second.getByTestId("verified-credit")).toHaveText("Fond : Fond de test MUNDI (dégradé neutre) · Usage interne aux tests");
    await expect(second.locator("[data-visual]")).toHaveCount(0);
  });

  test("avec réduction des animations, le motif ne bouge pas", async ({ browser }) => {
    const context = await browser.newContext({ baseURL: FIXTURES, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    const name = await page.locator('[data-index="0"] [data-visual="motif"] svg').evaluate((el) => getComputedStyle(el).animationName);
    expect(name).toBe("none");
    await context.close();
  });

  test("le lien « Lire la publication » ouvre la page complète, avec sources et dates", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-index="0"]').getByRole("link", { name: "Lire la publication" }).click();
    await expect(page).toHaveURL(new RegExp(`/actualites/${FIRST}/$`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Exemple de test");
    await expect(page.getByTestId("publication-meta")).toContainText("Exemple de test, jamais publié.");
    await expect(page.getByTestId("publication-meta")).toContainText("Publié le 20 novembre 2026");
    await expect(page.getByRole("link", { name: /Source fictive/ })).toHaveCount(4);
  });

  test("écouter une publication vérifiée lit son résumé", async ({ page }) => {
    await page.goto("/");
    const card = page.locator('[data-index="0"]');
    await card.getByRole("button", { name: "Écouter le résumé" }).click();
    const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toContain("Exemple de test");
  });

  test("une publication enregistrée apparaît dans Enregistrés", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-index="0"]').getByRole("button", { name: /^Enregistrer « Exemple de test/ }).click();
    await page.goto("/enregistres/");
    await page.reload();
    const saved = page.getByTestId("saved-publication");
    await expect(saved).toHaveCount(1);
    await expect(saved).toHaveAttribute("href", `/actualites/${FIRST}/`);
    await expect(saved).toContainText("Vérifié");
  });

  test("le badge de l'en-tête suit la carte : Vérifié, puis Démonstration", async ({ page }) => {
    await page.goto("/");
    const header = page.locator(".md\\:hidden").first();
    if (!(await header.isVisible())) test.skip(true, "En-tête du fil propre au mobile");
    await expect(header.getByText("Vérifié", { exact: true })).toBeVisible();
    await scrollFeedTo(page, 7);
    await expect(header.getByText("Démonstration", { exact: true })).toBeVisible();
  });

  test("filtrer par sujet garde seulement la publication de ce sujet", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Technologie" }).locator("visible=true").click();
    await expect(page.getByTestId("verified-card")).toHaveCount(1);
    await expect(page.locator('[data-index="0"]')).toHaveAttribute("data-publication", SECOND);
  });

  test("fin du fil : le nombre de publications vérifiées est affiché", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("feed-transition").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("verified-count")).toHaveText("2 publications vérifiées disponibles.");
  });

  for (const path of ["/", `/actualites/`, `/actualites/${FIRST}/`, "/enregistres/"]) {
    test(`contrastes et règles WCAG A/AA avec publications : ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(500);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const summary = results.violations.map((v) => `${v.id} (${v.nodes.length}) : ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
      expect(summary, "violations axe").toEqual([]);
    });
  }
});
