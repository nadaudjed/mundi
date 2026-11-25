import { expect, test } from "./fixtures";

/** Dossier de référence et « Suivre ce dossier » (ticket #120), pilote sur le cobalt. */
const DOSSIER = "/dossiers/cobalt-congolais/";
const NEWS = "/actualites/cobalt-la-rdc-suspend-de-nouveau-toutes-ses-exportations-a-partir-du-30-novembre/";
const RECIT = "/actualites/shaba-1977-1978-la-guerre-miniere-qui-a-fait-flamber-le-cobalt/";
const FIXTURES = `http://localhost:${Number(process.env.E2E_PORT ?? 4173) + 1}`;
const KEY = "mundi:follows:v1";

test.describe("Dossier cobalt", () => {
  test("structure : l'essentiel, comprendre, approfondir, chiffres sourcés, carte créditée, chronologie", async ({ page }) => {
    await page.goto(DOSSIER);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Cobalt congolais");
    await expect(page.getByTestId("dossier-meta")).toContainText("créé le");
    await expect(page.getByTestId("dossier-verification")).toContainText("Contrôle IA");
    // L'actualité et le récit du Shaba sont reliés.
    await expect(page.getByTestId("dossier-publication").getByRole("link")).toHaveCount(2);
    await expect(page.getByTestId("dossier-publication").getByRole("link").first()).toHaveAttribute("href", NEWS);
    // Chaque chiffre a sa source, son année et son périmètre.
    for (const figure of await page.getByTestId("dossier-figure").all()) {
      await expect(figure).toContainText("année :");
      await expect(figure.getByRole("link", { name: /^Source :/ })).toHaveAttribute("href", /^https:\/\//);
    }
    const map = page.getByTestId("dossier-map");
    expect((await map.getByRole("img").getAttribute("alt"))!.length).toBeGreaterThan(40);
    await expect(map).toContainText("Natural Earth");
    expect(await page.getByTestId("dossier-timeline").locator("li").count()).toBeGreaterThanOrEqual(5);
    await expect(page.getByTestId("dossier-corrections")).toContainText("Aucune correction");
    // Les emplacements vides (entretien, éléments à fournir) restent hors de la vue publique.
    await expect(page.getByTestId("dossier-interview")).toHaveCount(0);
    await expect(page.getByText("à fournir")).toHaveCount(0);
    // Pas d'outil de simulation en dehors des previews.
    await expect(page.getByTestId("dossier-simulate-box")).toHaveCount(0);
  });

  test("le sommaire fonctionne au clavier", async ({ page }) => {
    await page.goto(DOSSIER);
    const link = page.getByRole("navigation", { name: "Sommaire du dossier" }).getByRole("link", { name: "Ce qui a changé" });
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#ce-qui-a-change$/);
    await expect(page.getByRole("heading", { name: "Ce qui a changé" })).toBeInViewport();
  });

  test("l'actualité et le récit mènent au dossier", async ({ page }) => {
    for (const path of [NEWS, RECIT]) {
      await page.goto(path);
      await expect(page.getByTestId("dossier-link").getByRole("link")).toHaveAttribute("href", DOSSIER);
    }
  });
});

test.describe("Suivre ce dossier", () => {
  test("suivre, retrouver dans Bibliothèque après rechargement, puis arrêter", async ({ page }) => {
    await page.goto("/enregistres/");
    await expect(page.getByTestId("followed-empty")).toBeVisible();
    await page.goto(DOSSIER);
    const button = page.getByTestId("dossier-follow").getByRole("button");
    await expect(button).toHaveText("Suivre ce dossier");
    await button.click();
    await expect(button).toHaveText("Arrêter de suivre ce dossier");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.getByTestId("dossier-follow")).toHaveAttribute("data-state", "on");
    // Dossier sans mise à jour nouvelle : rien n'est signalé.
    await page.goto("/enregistres/");
    const item = page.getByTestId("followed-dossier");
    await expect(item).toHaveAttribute("data-new", "false");
    await expect(item).toContainText("Rien de nouveau");
    await expect(page.getByRole("heading", { name: "Articles enregistrés" })).toBeVisible();
    await page.goto(DOSSIER);
    await page.getByTestId("dossier-follow").getByRole("button").click();
    await expect(page.getByTestId("dossier-follow")).toHaveAttribute("data-state", "off");
    await page.goto("/enregistres/");
    await expect(page.getByTestId("followed-empty")).toBeVisible();
  });

  test("une mise à jour pas encore lue s'annonce dans Bibliothèque, mène au dossier, puis n'est plus nouvelle", async ({ page }) => {
    await page.goto("/enregistres/");
    // Le lecteur suivait le dossier avant la dernière mise à jour.
    await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ "cobalt-congolais": { followedAt: "2026-11-01T00:00:00Z", seen: [] } })), KEY);
    await page.reload();
    const item = page.getByTestId("followed-dossier");
    await expect(item).toHaveAttribute("data-new", "true");
    await expect(page.getByTestId("followed-update")).toContainText("25 novembre 2026");
    await expect(page.getByTestId("followed-update")).toContainText("suspend toutes ses exportations");
    await page.getByRole("link", { name: "Voir la mise à jour" }).click();
    await expect(page).toHaveURL(/\/dossiers\/cobalt-congolais\/#maj-/);
    const update = page.getByTestId("dossier-update").first();
    await expect(update).toHaveAttribute("data-new", "true");
    await expect(update).toHaveAttribute("data-kind", "fait");
    await expect(update).toContainText("Fait nouveau");
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!)["cobalt-congolais"].seen.length, KEY)).toBe(1);
    await page.goto("/enregistres/");
    await expect(page.getByTestId("followed-dossier")).toHaveAttribute("data-new", "false");
  });

  test("dossier retiré du site : signalé dans Bibliothèque, avec arrêt du suivi", async ({ page }) => {
    await page.goto("/enregistres/");
    await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ "dossier-retire": { followedAt: "2026-11-01T00:00:00Z", seen: [] } })), KEY);
    await page.reload();
    await expect(page.getByTestId("followed-missing")).toContainText("retiré du site");
    await page.getByRole("button", { name: "Arrêter de le suivre" }).click();
    await expect(page.getByTestId("followed-empty")).toBeVisible();
  });

  test("le suivi cohabite avec les favoris et les préférences déjà enregistrés", async ({ page }) => {
    await page.goto("/enregistres/");
    await page.evaluate(() => {
      localStorage.setItem("mundi:bookmarks", JSON.stringify(["actualite:cobalt-la-rdc-suspend-de-nouveau-toutes-ses-exportations-a-partir-du-30-novembre"]));
      localStorage.setItem("mundi:topics:v1", JSON.stringify(["materiaux-critiques"]));
    });
    await page.goto(DOSSIER);
    await page.getByTestId("dossier-follow").getByRole("button").click();
    await page.goto("/enregistres/");
    await expect(page.getByTestId("followed-dossier")).toHaveCount(1);
    await expect(page.getByTestId("saved-publication")).toHaveCount(1);
    expect(await page.evaluate(() => [localStorage.getItem("mundi:bookmarks"), localStorage.getItem("mundi:topics:v1")])).toEqual([
      JSON.stringify(["actualite:cobalt-la-rdc-suspend-de-nouveau-toutes-ses-exportations-a-partir-du-30-novembre"]),
      JSON.stringify(["materiaux-critiques"]),
    ]);
  });

  test("stockage indisponible : un message clair, le dossier reste lisible", async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => { throw new DOMException("Bloqué", "QuotaExceededError"); };
    });
    await page.goto(DOSSIER);
    await page.getByTestId("dossier-follow").getByRole("button").click();
    await expect(page.getByTestId("dossier-follow")).toContainText("stockage indisponible");
    await expect(page.getByRole("heading", { name: "L'essentiel" })).toBeVisible();
  });

  test("preview : « Simuler une nouvelle mise à jour » permet de tester l'arrivée d'une nouveauté", async ({ page }) => {
    await page.goto(FIXTURES + DOSSIER);
    await page.getByTestId("dossier-follow").getByRole("button").click();
    await page.getByRole("button", { name: "Simuler une nouvelle mise à jour" }).click();
    await page.goto(FIXTURES + "/enregistres/");
    await expect(page.getByTestId("followed-dossier")).toHaveAttribute("data-new", "true");
    await expect(page.getByTestId("followed-update")).toContainText("Exemple de mise à jour");
  });
});
