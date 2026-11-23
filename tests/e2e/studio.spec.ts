import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

/**
 * MUNDI Studio : import d'une fiche de veille « mundi-candidate-v1 » et
 * prévisualisation du brouillon. Les fiches utilisées ici sont INVENTÉES
 * (tests/fixtures/candidates/) et ne quittent jamais le navigateur de test.
 */
const VALID = readFileSync("tests/fixtures/candidates/valide.json", "utf8");
const json = (o: unknown) => JSON.stringify(o);
const base = JSON.parse(VALID) as Record<string, unknown>;

async function upload(page: import("@playwright/test").Page, content: string, name = "mundi-candidat-test.json") {
  await page.getByTestId("candidate-file").setInputFiles({ name, mimeType: "application/json", buffer: Buffer.from(content) });
}

test.describe("MUNDI Studio : import d'une fiche de veille", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/atelier/");
  });

  test("une fiche valide préremplit seulement les éléments attribuables", async ({ page }) => {
    await expect(page.getByTestId("status-steps")).toHaveAttribute("data-stage", "brouillon");
    await upload(page, VALID);
    const summary = page.getByTestId("candidate-summary");
    await expect(summary).toContainText("candidat non vérifié");
    await expect(summary).toContainText("Média fictif (test)");
    await expect(summary).toContainText("23 novembre 2026");
    await expect(summary).toContainText("date externe, pas une date MUNDI");
    await expect(summary.getByRole("link", { name: "https://sources.mundi.test/veille/exemple" })).toHaveAttribute("rel", /noopener/);
    await expect(page.getByTestId("status-steps")).toHaveAttribute("data-stage", "candidat");

    await expect(page.getByLabel("Titre de la publication")).toHaveValue("Exemple de test : titre de veille inventé, à vérifier");
    await expect(page.getByText("Titre provisoire repris de la source")).toBeVisible();
    await expect(page.getByLabel("Rubrique")).toHaveValue("economie");
    await expect(page.getByLabel("Source 1 — nom")).toHaveValue("Média fictif (test)");
    await expect(page.getByLabel("Source 1 — lien HTTPS")).toHaveValue("https://sources.mundi.test/veille/exemple");
    // Rien n'est inventé : le texte factuel, les idées et la deuxième source restent vides.
    for (const label of ["Résumé", "Idée 1", "Idée 2", "Idée 3", "Faits vérifiés", "Source 2 — nom", "Source 2 — lien HTTPS"]) {
      await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
    }
    const todo = page.getByTestId("draft-todo");
    await expect(todo).toContainText("Une deuxième source indépendante");
    await expect(todo).toContainText("Lire l'article d'origine");
    await expect(todo).toContainText("Vérifier les conditions de réutilisation");

    // Dès qu'on rédige, le sujet devient un brouillon ; « Publié » n'est jamais l'étape actuelle.
    await page.getByLabel("Résumé").fill("Un résumé rédigé à la main pour le test.");
    await expect(page.getByTestId("status-steps")).toHaveAttribute("data-stage", "brouillon");
    await expect(page.locator('[aria-current="step"]')).toContainText("Brouillon");
  });

  test("le téléchargement exige la deuxième source et les vérifications, puis reste un brouillon", async ({ page }) => {
    await upload(page, VALID);
    await page.getByRole("button", { name: "Télécharger le brouillon JSON" }).click();
    const status = page.getByRole("status").filter({ hasText: "Confirmez" });
    await expect(status).toContainText("Confirmez que vous avez lu l'article d'origine.");

    await page.getByLabel("Résumé").fill("Résumé original rédigé pour ce test automatique.");
    for (const i of [1, 2, 3]) await page.getByLabel(`Idée ${i}`, { exact: true }).fill(`Idée essentielle numéro ${i} du test.`);
    await page.getByLabel("Faits vérifiés").fill("Des faits inventés uniquement pour ce test automatique.");
    await page.getByLabel("Source 2 — nom").fill("Deuxième source fictive (test)");
    await page.getByLabel("Source 2 — lien HTTPS").fill("https://sources.mundi.test/veille/exemple");
    await page.getByLabel("J'ai ouvert et lu l'article d'origine.").check();
    await page.getByLabel("J'ai vérifié les conditions de réutilisation de cette source.").check();
    await page.getByRole("button", { name: "Télécharger le brouillon JSON" }).click();
    await expect(page.getByRole("status").filter({ hasText: "deuxième source" })).toContainText("La deuxième source doit être différente de la première.");

    await page.getByLabel("Source 2 — lien HTTPS").fill("https://autre.mundi.test/document");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Télécharger le brouillon JSON" }).click();
    const file = await download;
    const data = JSON.parse(readFileSync((await file.path())!, "utf8"));
    expect(data.status).toBe("draft");
    expect(data.reviewedBy).toBe("");
    expect(data.origin).toMatchObject({ reviewStatus: "candidate_unverified", sourceUrl: "https://sources.mundi.test/veille/exemple", externalPublishedAt: "2026-11-23T09:00:00.000Z" });
    await expect(page.getByTestId("draft-todo")).toContainText("Le brouillon est complet");
  });

  const invalid: [string, string, RegExp][] = [
    ["JSON illisible", "{ pas du json", /pas un JSON lisible/],
    ["mauvais format", json({ ...base, format: "autre-format" }), /Format non reconnu/],
    ["statut publié", json({ ...base, reviewStatus: "published" }), /Statut refusé/],
    ["lien javascript:", json({ ...base, source: { label: "X", url: "javascript:alert(1)" } }), /seules les adresses publiques en HTTPS/],
    ["lien http", json({ ...base, source: { label: "X", url: "http://sources.mundi.test/a" } }), /HTTPS/],
    ["lien avec identifiants", json({ ...base, source: { label: "X", url: "https://user:pass@sources.mundi.test/a" } }), /HTTPS/],
    ["caractère de contrôle", json({ ...base, headline: "Titre‮à l'envers" }), /caractères interdits/],
    ["date invalide", json({ ...base, publishedAt: "hier" }), /Date de la source invalide/],
    ["liste au lieu d'une fiche", json([base]), /une seule fiche/],
    ["fichier trop gros", json({ ...base, headline: "x".repeat(30_000) }), /trop volumineux/],
  ];
  for (const [name, content, error] of invalid) {
    test(`fiche refusée avec un message clair : ${name}`, async ({ page }) => {
      await upload(page, content);
      await expect(page.getByTestId("import-errors")).toContainText(error);
      await expect(page.getByTestId("candidate-summary")).toHaveCount(0);
      await expect(page.getByLabel("Titre de la publication")).toHaveValue("");
    });
  }

  test("un titre contenant du HTML est affiché comme du texte, jamais exécuté", async ({ page }) => {
    let dialog = false;
    page.on("dialog", (d) => {
      dialog = true;
      void d.dismiss();
    });
    const attack = '<img src=x onerror="alert(1)"> Titre piégé pour le test';
    await upload(page, json({ ...base, headline: attack, extra: "<script>alert(2)</script>" }));
    await expect(page.getByLabel("Titre de la publication")).toHaveValue(attack);
    await expect(page.getByTestId("candidate-summary")).toContainText("Champs ignorés : extra");
    await page.getByRole("button", { name: "Prévisualiser dans le fil" }).click();
    const preview = page.getByTestId("draft-preview");
    await expect(preview.getByRole("heading", { level: 2 })).toHaveText(attack);
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
    expect(dialog).toBe(false);
  });
});

test.describe("MUNDI Studio : prévisualisation", () => {
  test("l'aperçu ressemble au fil, affiche « Brouillon — non publié » et jamais « Vérifié »", async ({ page }) => {
    await page.goto("/atelier/");
    await upload(page, VALID);
    await page.getByRole("button", { name: "Prévisualiser dans le fil" }).click();
    const preview = page.getByRole("region", { name: "Prévisualisation du brouillon" });
    await expect(preview).toBeVisible();
    await expect(preview.getByTestId("draft-badge")).toHaveText("Brouillon — non publié");
    await expect(preview).toContainText("Non vérifié");
    await expect(preview.getByText("Vérifié", { exact: true })).toHaveCount(0);
    await expect(preview).toContainText("Économie");
    await expect(preview).toContainText("[Résumé à rédiger]");
    await expect(preview).toContainText("[Deuxième source à rédiger]");
    await expect(preview).toContainText("Date de la source externe : 23 novembre 2026");
    // L'aperçu suit la saisie.
    await page.getByLabel("Résumé").fill("Un résumé visible dans l'aperçu.");
    await expect(preview).toContainText("Un résumé visible dans l'aperçu.");
    await page.getByRole("button", { name: "Masquer la prévisualisation" }).click();
    await expect(preview).toHaveCount(0);
  });

  test("un brouillon importé n'apparaît jamais dans le fil public", async ({ page }) => {
    await page.goto("/atelier/");
    await upload(page, VALID);
    await page.goto("/");
    await expect(page.locator('[data-index="0"]')).toBeVisible();
    await expect(page.getByText("titre de veille inventé")).toHaveCount(0);
    await page.goto("/actualites/");
    await expect(page.getByText("titre de veille inventé")).toHaveCount(0);
  });
});

test("atelier avec fiche importée et aperçu ouvert : règles WCAG A/AA", async ({ page }) => {
  await page.goto("/atelier/");
  await upload(page, VALID);
  await upload(page, "{ pas du json");
  await upload(page, VALID);
  await page.getByRole("button", { name: "Prévisualiser dans le fil" }).click();
  await expect(page.getByTestId("draft-preview")).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.nodes.length}) : ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, "violations axe").toEqual([]);
});
