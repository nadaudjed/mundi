import { readFileSync } from "node:fs";
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
/** Les agents publient désormais seuls : on compte ce que contient réellement le site normal. */
const LIVE = (JSON.parse(readFileSync("content/publications.json", "utf8")) as { status: string }[]).filter((p) => p.status === "published").length;
const TEXTILES = "dechets-textiles-europe-2024-23-millions-tonnes";

test.describe("Site normal : première publication Eurostat approuvée", () => {
  test("le fil montre les vraies publications et leurs cartes de données, sans démonstration", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-index="0"]')).toBeVisible();
    await expect(page.locator('[data-index="0"]')).toHaveAttribute("data-testid", "verified-card");
    await expect(page.getByTestId("verified-card")).toHaveCount(LIVE);
    await expect(page.getByTestId("data-card")).toHaveCount(4);
    await expect(page.getByTestId("demo-divider")).toHaveCount(0);
    await expect(page.locator("[data-story]")).toHaveCount(0);
    await expect(page.locator(`[data-testid="verified-card"][data-publication="${TEXTILES}"]`)).toHaveCount(1);
    await expect(page.getByTestId("verified-count")).toHaveText(LIVE === 1 ? "1 publication sourcée disponible." : `${LIVE} publications sourcées disponibles.`);
  });

  test("chaque carte de données montre la photo de sa publication, avec son crédit, sans zone vide", async ({ page }) => {
    await page.goto("/");
    const cards = page.getByTestId("data-card");
    for (let i = 0; i < (await cards.count()); i++) {
      const card = cards.nth(i);
      await card.scrollIntoViewIfNeeded();
      await expect(card.getByTestId("data-photo").locator("img")).toHaveAttribute("src", /\/media\/editorial\//);
      await expect(card.getByTestId("editorial-photo-credit")).toHaveCount(1);
    }
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

  test("les publications vérifiées forment tout le fil, puis l'écran de fin", async ({ page }) => {
    // La première publication est suivie de ses 4 cartes de données (tests/e2e/data-cards.spec.ts).
    await page.goto("/");
    const cards = page.getByTestId("verified-card");
    await expect(cards).toHaveCount(2);
    // Ordre : la plus récente d'abord.
    await expect(page.locator('[data-index="0"]')).toHaveAttribute("data-publication", FIRST);
    for (const i of [1, 2, 3, 4]) await expect(page.locator(`[data-index="${i}"]`)).toHaveAttribute("data-testid", "data-card");
    await expect(page.locator('[data-index="5"]')).toHaveAttribute("data-publication", SECOND);
    await expect(page.locator('[data-index="6"]')).toHaveAttribute("data-testid", "feed-transition");
    await expect(page.locator('[data-index="7"]')).toHaveCount(0);

    const first = page.locator('[data-index="0"]');
    await expect(first.getByText("Vérifié", { exact: true })).toHaveCount(0);
    await expect(first.getByText("Exemple de test", { exact: true })).toBeVisible();
    await expect(first.getByTestId("verified-meta")).toContainText("publié le 20 novembre 2026");
    await expect(first.getByTestId("verified-meta")).toContainText("actualisé le 21 novembre 2026");
    await expect(first.getByTestId("verification-label")).toHaveText("Validation humaine");
    await expect(first.getByTestId("verified-meta").locator("time").first()).toHaveAttribute("datetime", "2026-11-20");
    // Aucune mention « Contenu illustratif » sur une publication vérifiée.
    await expect(first.getByText("illustratif")).toHaveCount(0);
  });

  test("une publication automatique dit clairement qu'elle n'a pas été relue par un humain", async ({ page }) => {
    await page.goto("/");
    const card = page.locator(`[data-publication="${SECOND}"]`);
    await expect(card.getByTestId("verification-label")).toHaveText("Contrôle IA, sans relecture humaine");
    await page.goto(`/actualites/${SECOND}/`);
    await expect(page.getByTestId("verification-label")).toHaveText("Contrôle IA, sans relecture humaine");
    await expect(page.getByText(/Vérifiée par l.IA/)).toHaveCount(0);
    // Une publication relue par une personne garde sa mention habituelle.
    await page.goto(`/actualites/${FIRST}/`);
    await expect(page.getByTestId("verification-label")).toHaveText("Validation humaine");
  });

  test("les sources restent visibles et cliquables dans la carte immersive", async ({ page }, testInfo) => {
    await page.goto("/");
    const card = page.locator('[data-index="0"]');
    if (testInfo.project.name === "mobile") {
      // Sur téléphone, la carte garde la place pour le texte : un lien mène aux sources de l'article.
      const link = card.getByTestId("verified-sources-link");
      await expect(link).toBeVisible();
      await expect(link).toHaveText("4 sources");
      await expect(link).toHaveAttribute("href", new RegExp(`/actualites/${FIRST}/?#sources$`));
      return;
    }
    const sources = card.getByTestId("verified-sources");
    const links = sources.getByRole("link", { name: /Source fictive/ });
    await expect(links).toHaveCount(4);
    await expect(links.first()).toHaveAttribute("href", "https://sources.mundi.test/a");
    await expect(links.first()).toHaveAttribute("target", "_blank");
    await expect(links.first()).toHaveAttribute("rel", /noopener/);
    // Liste numérotée, libellés complets (plus de pastilles tronquées).
    await expect(sources.locator("li").first()).toContainText("01");
  });

  test("une carte sans photo affiche son chiffre clé ; une carte avec fond approuvé affiche la scène", async ({ page }) => {
    await page.goto("/");
    const first = page.locator('[data-index="0"]');
    await expect(first.getByTestId("verified-credit")).toHaveText("Chiffre clé : Jeu de données fictif (test)");
    await expect(first.getByTestId("card-visual")).toContainText("1 234,5");
    await expect(first.locator("video, img")).toHaveCount(0);
    // La seconde publication demande un fond du registre (fond de test neutre, tests/fixtures/scenes/).
    const second = page.locator('[data-index="5"]');
    await expect(second.getByTestId("scene-backdrop")).toHaveAttribute("data-backdrop", "test-fond-neutre");
    await expect(second.getByTestId("scene-backdrop")).toHaveAttribute("aria-hidden", "true");
    await expect(second.getByTestId("verified-credit")).toHaveText("Fond : Fond de test MUNDI (dégradé neutre) · Usage interne aux tests");
    await expect(second.locator("[data-visual]")).toHaveCount(0);
  });

  test("plus aucun motif génératif animé dans le fil", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-visual="motif"]')).toHaveCount(0);
    await expect(page.locator(".grain")).toHaveCount(0);
  });

  test("le lien « Lire la publication » ouvre la page complète, avec sources et dates", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-index="0"]').getByRole("link", { name: "Lire la publication" }).click();
    await expect(page).toHaveURL(new RegExp(`/actualites/${FIRST}/$`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Exemple de test");
    await expect(page.getByTestId("publication-meta")).toContainText("Exemple de test, jamais publié.");
    await expect(page.getByTestId("publication-meta")).toContainText("publié le 20 novembre 2026");
    await expect(page.getByRole("link", { name: /Source fictive/ })).toHaveCount(4);
  });

  test("le retour arrière ramène à la carte où l'on était, pas au début du fil", async ({ page }) => {
    await page.goto("/");
    await scrollFeedTo(page, 5);
    await page.locator('[data-index="5"]').getByRole("link", { name: "Lire la publication" }).click();
    await expect(page).toHaveURL(new RegExp(`/actualites/${SECOND}/$`));
    await page.goBack();
    await expect(page.locator('[data-index="5"]')).toBeInViewport({ ratio: 0.9 });
  });

  test("le résumé de la carte s'arrête sur une ligne entière, au-dessus des boutons", async ({ page }, testInfo) => {
    await page.goto("/");
    const card = page.locator('[data-index="0"]');
    const summary = card.getByTestId("verified-summary");
    await expect(summary).toBeVisible();
    // Écran large : la colonne de texte affiche le résumé complet.
    if (testInfo.project.name !== "mobile") return expect(summary).toHaveCSS("display", "block");
    const box = await summary.evaluate((el) => {
      const s = getComputedStyle(el);
      const line = parseFloat(s.lineHeight);
      const lines = Number(s.webkitLineClamp);
      return { lines, visible: Math.min(el.clientHeight, lines * line), line, bottom: el.getBoundingClientRect().top + lines * line };
    });
    expect(box.lines).toBeGreaterThanOrEqual(2);
    // La hauteur affichée est un nombre entier de lignes : aucune ligne coupée à mi-hauteur.
    expect(Math.abs(box.visible / box.line - Math.round(box.visible / box.line))).toBeLessThan(0.05);
    const actions = await card.getByRole("link", { name: "Lire la publication" }).boundingBox();
    expect(box.bottom).toBeLessThanOrEqual(actions!.y);
  });

  test("chaque actualité affiche clairement sa date : carte du Fil, listes et page article", async ({ page }) => {
    await page.goto("/");
    // La date de l'événement (jeudi 19) passe avant celle de la publication (vendredi 20).
    await expect(page.locator('[data-index="0"]').getByTestId("news-date")).toHaveText("Événement du 19 novembre 2026");
    await expect(page.locator('[data-index="0"]').getByTestId("news-date").locator("time")).toHaveAttribute("datetime", "2026-11-19");
    await expect(page.locator('[data-index="0"]').getByTestId("verified-meta")).toContainText("publié le 20 novembre 2026");
    // La date garde la police du reste de la ligne (plus de chiffres à chasse fixe).
    const fonts = await page.locator('[data-index="0"]').getByTestId("verified-meta").evaluate((el) => [getComputedStyle(el).fontFamily, getComputedStyle(el.querySelector("time")!).fontFamily]);
    expect(fonts[1]).toBe(fonts[0]);
    const full = "Événement du jeudi 19 novembre 2026 · publiée le 20 novembre 2026";
    await page.goto("/explorer/");
    await expect(page.getByTestId("publication-tile").first().getByTestId("news-date")).toHaveText(full);
    await page.goto(`/actualites/${FIRST}/`);
    await expect(page.getByTestId("news-date")).toHaveText(full);
    await page.goto(`/actualites/${SECOND}/`);
    await expect(page.getByTestId("news-date")).toContainText("Concept publié le");
  });

  test("sans version audio enregistrée, Écouter lit le résumé avec la voix de l'appareil", async ({ page }) => {
    await page.goto(`/actualites/${SECOND}/`);
    await page.getByRole("button", { name: "Écouter le résumé" }).click();
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
    await expect(saved.getByRole("link")).toHaveAttribute("href", `/actualites/${FIRST}/`);
    await expect(saved).toContainText("Validation humaine");
  });

  test("l'en-tête du fil n'a ni badge « Vérifié » ni mention « Démo »", async ({ page }) => {
    await page.goto("/");
    const header = page.getByTestId("feed-topbar");
    await expect(page.getByText("Vérifié", { exact: true })).toHaveCount(0);
    await scrollFeedTo(page, 5);
    await expect(header.getByText(/^Démo(nstration)?$/)).toHaveCount(0);
  });

  test("filtrer par sujet garde seulement la publication de ce sujet", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Choisir un sujet/ }).click();
    await page.getByRole("group", { name: "Filtrer le fil par sujet" }).getByRole("button", { name: "Technologie" }).click();
    await expect(page.getByTestId("verified-card")).toHaveCount(1);
    await expect(page.locator('[data-index="0"]')).toHaveAttribute("data-publication", SECOND);
  });

  test("fin du fil : le nombre de publications vérifiées est affiché", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("feed-transition").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("verified-count")).toHaveText("2 publications sourcées disponibles.");
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
