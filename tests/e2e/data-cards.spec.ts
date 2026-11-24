import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, scrollFeedTo, test } from "./fixtures";

/**
 * Cartes de données (ticket #25). Toutes les valeurs utilisées ici sont
 * INVENTÉES (tests/fixtures/publications.fixture.json et tests/fixtures/data-cards/)
 * et ne servent qu'aux tests : aucune n'est publiée.
 */
const PORT = Number(process.env.E2E_PORT ?? 4173);
const FIXTURES = `http://localhost:${PORT + 1}`;
const FIRST = "test-publication-energie";
const VALID = readFileSync("tests/fixtures/data-cards/valide.json", "utf8");
/** Les rédacteurs automatiques ajoutent des cartes : on compte celles réellement publiées. */
// Seuls les articles « en cartes » les montrent dans le fil (dataCardsInFeed false : simple article).
const LIVE_DATA_CARDS = (JSON.parse(readFileSync("content/publications.json", "utf8")) as { status: string; dataCards?: unknown[]; dataCardsInFeed?: boolean }[])
  .filter((p) => p.status === "published" && p.dataCardsInFeed !== false).reduce((n, p) => n + (p.dataCards?.length ?? 0), 0);

test.describe("Site normal : cartes vérifiées Eurostat", () => {
  test("le fil public présente toutes ses cartes chiffrées et aucune source fictive", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('[data-index="0"]')).toBeVisible();
    await expect(page.getByTestId("data-card")).toHaveCount(LIVE_DATA_CARDS);
    // Les publications automatiques peuvent précéder le récit Eurostat : on cible sa carte par son contenu.
    const card = page
      .getByTestId("data-card")
      .filter({ hasText: "déchets textiles traités" })
      .filter({ has: page.getByTestId("stat-value").filter({ hasText: "78" }) });
    await expect(card).toHaveCount(1);
    const html = await (await request.get("/")).text();
    expect(html).not.toContain("donnees.mundi.test");
  });
});

test.describe("Site de test : cartes d'une publication approuvée", () => {
  test.use({ baseURL: FIXTURES });

  test("les cartes suivent leur publication, dans l'ordre, avec leur position", async ({ page }) => {
    await page.goto("/");
    const cards = page.getByTestId("data-card");
    await expect(cards).toHaveCount(4);
    const kinds = ["stat", "comparaison", "comparaison", "explication"];
    for (const [i, kind] of kinds.entries()) {
      const card = page.locator(`[data-index="${i + 1}"]`);
      await expect(card).toHaveAttribute("data-publication", FIRST);
      await expect(card.locator("[data-card-kind]")).toHaveAttribute("data-card-kind", kind);
      await expect(card).toContainText(`Données · carte ${i + 1} sur 4`);
      // Une carte publiée n'est jamais marquée brouillon.
      await expect(card.getByText("Brouillon — non publié")).toHaveCount(0);
    }
  });

  test("chiffre clé : valeur au format français, unité, périmètre, période et source", async ({ page }) => {
    await page.goto("/");
    await scrollFeedTo(page, 1);
    const card = page.locator('[data-index="1"]');
    const value = card.getByTestId("stat-value");
    await expect(value).toContainText("1 234,5");
    await expect(value).toContainText("unités fictives");
    await expect(value).toContainText("Territoire fictif");
    await expect(value).toContainText("Année de test 2026");
    // Texte complet pour les lecteurs d'écran.
    await expect(value.locator(".sr-only")).toHaveText(/Quantité inventée pour le test : 1\s234,5 unités fictives, Territoire fictif, Année de test 2026\./);
    const footer = card.getByTestId("data-footer");
    await expect(footer).toContainText("À savoir : Donnée fictive : aucune mesure réelle.");
    await expect(footer).toContainText("données du 1 novembre 2026");
    await expect(footer.locator("time")).toHaveAttribute("datetime", "2026-11-01");
    const link = footer.getByRole("link", { name: /Jeu de données fictif \(test\)/ });
    await expect(link).toHaveAttribute("href", "https://donnees.mundi.test/jeu-fictif");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("target", "_blank");
    // Aucun visuel ni emplacement vide dans le fil quand la direction artistique n'en fournit pas.
    await expect(card.getByTestId("data-visual")).toHaveCount(0);
    await expect(card.getByTestId("data-visual-placeholder")).toHaveCount(0);
  });

  test("échelle commune : barres proportionnelles aux valeurs fournies", async ({ page }) => {
    await page.goto("/");
    await scrollFeedTo(page, 2);
    const card = page.locator('[data-index="2"]');
    await expect(card.locator("[data-tone]")).toHaveAttribute("data-tone", "ivory");
    const cmp = card.getByTestId("comparison");
    await expect(cmp).toHaveAttribute("data-presentation", "echelle-commune");
    await expect(cmp).toContainText("40 %");
    await expect(cmp).toContainText("de l’ensemble fictif");
    const bars = cmp.getByTestId("comparison-bar");
    await expect(bars).toHaveCount(2);
    const widths = await bars.evaluateAll((els) => els.map((e) => (e as HTMLElement).style.width));
    expect(widths).toEqual(["100%", "50%"]);
    await expect(card.getByTestId("distinct-note")).toHaveCount(0);
  });

  test("dénominateurs différents : pas de barres communes, avertissement affiché", async ({ page }) => {
    await page.goto("/");
    await scrollFeedTo(page, 3);
    const card = page.locator('[data-index="3"]');
    const cmp = card.getByTestId("comparison");
    await expect(cmp).toHaveAttribute("data-presentation", "valeurs-distinctes");
    await expect(cmp.getByTestId("comparison-bar")).toHaveCount(0);
    await expect(cmp).toContainText("des objets fictifs collectés");
    await expect(cmp).toContainText("des objets fictifs produits");
    await expect(card.getByTestId("distinct-note")).toContainText("pas le même dénominateur");
  });

  test("explication en alternatives : un point de départ, des issues sans numéro ni ordre", async ({ page }) => {
    await page.goto("/");
    await scrollFeedTo(page, 4);
    const card = page.locator('[data-index="4"]');
    const ex = card.getByTestId("explanation");
    await expect(ex).toHaveAttribute("data-layout", "alternatives");
    await expect(ex).toContainText("Départ fictif");
    await expect(ex).toContainText("Ensuite, selon les cas :");
    const options = ex.locator("li");
    await expect(options).toHaveCount(2);
    await expect(options.nth(0)).toContainText("Fait");
    await expect(options.nth(1)).toContainText("Hypothèse");
    await expect(options.nth(1).locator(".sr-only")).toHaveText("ou");
    // Aucune pastille numérotée : rien ne suggère « A puis B ».
    await expect(ex.locator("ol")).toHaveCount(0);
    // Seule la dernière carte propose « Comprendre ».
    await expect(page.locator('[data-index="1"]').getByRole("link", { name: "Comprendre" })).toHaveCount(0);
    await card.getByRole("link", { name: "Comprendre" }).click();
    await expect(page).toHaveURL(new RegExp(`/actualites/${FIRST}/$`));
  });

  test("barres de comparaison : affichées à leur taille finale, sans animation décorative", async ({ browser }) => {
    const reduced = await browser.newContext({ baseURL: FIXTURES, reducedMotion: "reduce" });
    const page = await reduced.newPage();
    await page.goto("/");
    await scrollFeedTo(page, 2);
    const bar = page.locator('[data-index="2"]').getByTestId("comparison-bar").first();
    expect(await bar.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    // Sans animation, la barre est affichée à sa taille finale.
    expect(await bar.evaluate((el) => getComputedStyle(el).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    await reduced.close();
  });

  test("accessibilité : chaque carte est un groupe nommé et passe axe", async ({ page }) => {
    await page.goto("/");
    for (const i of [1, 2, 3, 4]) {
      await scrollFeedTo(page, i);
      const group = page.locator(`[data-index="${i}"]`).getByRole("group");
      await expect(group).toHaveAccessibleName(/Exemple de test/);
      const results = await new AxeBuilder({ page }).include(`[data-index="${i}"]`).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    }
  });

  test("téléphone : la carte tient dans l'écran sans défilement horizontal", async ({ page }) => {
    await page.goto("/");
    for (const i of [1, 2, 3, 4]) {
      await scrollFeedTo(page, i);
      const overflow = await page.locator(`[data-index="${i}"] [data-card-kind]`).evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});

test.describe("MUNDI Studio : aperçu des cartes de données", () => {
  async function upload(page: import("@playwright/test").Page, content: string, name = "cartes-test.json") {
    await page.getByTestId("data-cards-file").setInputFiles({ name, mimeType: "application/json", buffer: Buffer.from(content) });
  }

  test.beforeEach(async ({ page }) => {
    await page.goto("/atelier/");
  });

  test("des cartes valides s'affichent en brouillon, sans badge Vérifié", async ({ page }) => {
    await upload(page, VALID);
    const preview = page.getByTestId("data-cards-preview");
    await expect(preview.locator("[data-card-kind]")).toHaveCount(4);
    await expect(preview.getByText("Brouillon — non publié")).toHaveCount(4);
    // Explication en séquence : étapes numérotées dans l'ordre.
    const seq = preview.getByTestId("explanation");
    await expect(seq).toHaveAttribute("data-layout", "sequence");
    await expect(seq.locator("li")).toHaveCount(2);
    await expect(preview.getByText("Vérifié", { exact: true })).toHaveCount(0);
    await expect(preview.getByTestId("data-visual-placeholder")).toHaveCount(4);
    await expect(preview.getByRole("link", { name: "Comprendre" })).toHaveCount(0);
    await expect(page.getByTestId("data-cards-studio")).toContainText("4 cartes importées (cartes-test.json)");
    const results = await new AxeBuilder({ page }).include('[data-testid="data-cards-studio"]').analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help} ${v.nodes.map((n) => n.target.join(" ") + " " + n.failureSummary).join(" | ")}`)).toEqual([]);

    await page.getByRole("button", { name: "Retirer les cartes" }).click();
    await expect(preview).toHaveCount(0);
  });

  test("les cartes importées sont ajoutées au brouillon téléchargé", async ({ page }) => {
    await upload(page, VALID);
    await page.getByLabel("Titre de la publication").fill("Exemple de test : brouillon avec cartes");
    await page.getByLabel("Résumé").fill("Résumé inventé pour vérifier l'export des cartes de données.");
    for (const i of [1, 2, 3]) await page.getByLabel(`Idée ${i}`).fill(`Idée inventée numéro ${i} pour le test.`);
    await page.getByLabel("Faits vérifiés").fill("Faits inventés pour vérifier l'export, sans valeur réelle.");
    await page.getByLabel("Source 1 — nom").fill("Source fictive A");
    await page.getByLabel("Source 1 — lien HTTPS").fill("https://sources.mundi.test/a");
    await page.getByLabel("Source 2 — nom").fill("Source fictive B");
    await page.getByLabel("Source 2 — lien HTTPS").fill("https://sources.mundi.test/b");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Télécharger le brouillon JSON" }).click();
    const file = await (await download).path();
    const data = JSON.parse(readFileSync(file, "utf8"));
    expect(data.status).toBe("draft");
    expect(data.dataCards).toEqual(JSON.parse(VALID).cards);
  });

  test("des cartes invalides sont refusées avec des messages clairs", async ({ page }) => {
    const bad = JSON.parse(VALID);
    delete bad.cards[0].measure.unit;
    delete bad.cards[1].items[0].denominator;
    bad.cards[2].presentation = "echelle-commune";
    bad.cards[2].source.url = "http://donnees.mundi.test/";
    bad.cards[3].layout = "alternatives";
    await upload(page, JSON.stringify(bad));
    const alert = page.getByTestId("data-cards-errors");
    await expect(alert).toHaveAttribute("role", "alert");
    await expect(alert).toContainText("Carte 1 : unité manquante");
    await expect(alert).toContainText("Carte 2, valeur 1 : un pourcentage ou un ratio doit indiquer son dénominateur");
    await expect(alert).toContainText("Carte 3 : une échelle commune exige la même unité et le même dénominateur");
    await expect(alert).toContainText("Carte 3 : source HTTPS requise");
    await expect(alert).toContainText("Carte 4 : des alternatives exigent un point de départ et au moins deux issues");
    await expect(page.getByTestId("data-cards-preview")).toHaveCount(0);
  });

  test("un fichier d'un autre format ou mal formé est refusé", async ({ page }) => {
    await upload(page, JSON.stringify({ format: "autre", cards: [] }));
    await expect(page.getByTestId("data-cards-errors")).toContainText("Format inconnu");
    await upload(page, "{ pas du json");
    await expect(page.getByTestId("data-cards-errors")).toContainText("n'est pas un JSON valide");
    await upload(page, JSON.stringify({ format: "mundi-data-cards-v1", cards: [JSON.parse(VALID).cards[0]] }));
    await expect(page.getByTestId("data-cards-errors")).toContainText("Une séquence contient 2 à 4 cartes");
  });
});
