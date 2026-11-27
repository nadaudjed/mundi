import { expect, test, type Page } from "@playwright/test";

/**
 * Changement d'adresse (#129) : transfert des données locales entre deux origines réelles.
 * Les deux adresses publiques sont servies par le site local (interception réseau) : le navigateur
 * les traite comme deux origines distinctes, chacune avec son propre stockage.
 */
const LEGACY = "https://mundiapptest.netlify.app";
const OFFICIAL = "https://mundi.nadaudjacques004.workers.dev";

async function serveBothOrigins(page: Page, baseURL: string) {
  for (const origin of [LEGACY, OFFICIAL]) {
    await page.route(`${origin}/**`, async (route) => {
      const url = new URL(route.request().url());
      // Une requête abandonnée par une navigation (changement de page) n'est pas une erreur du test.
      try {
        const res = await route.fetch({ url: baseURL.replace(/\/$/, "") + url.pathname + url.search });
        await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
      } catch { /* requête annulée */ }
    });
  }
}

const SAVED = {
  "mundi:bookmarks": JSON.stringify(["actualite:ancien-favori"]),
  "mundi:follows:v1": JSON.stringify({ "cobalt-congolais": { followedAt: "2026-11-20T10:00:00.000Z", seen: ["u1"] } }),
  "mundi:topics:v1": JSON.stringify(["energie"]),
  "mundi:revision:v1": JSON.stringify({ "ancien-favori": { level: 2, nextAt: "2026-12-01T00:00:00.000Z", lastAt: "2026-11-25T08:00:00.000Z" } }),
  "mundi:theme": "dark",
};

test("emporter ses données de l'ancienne adresse vers la nouvelle, sans doublon au second import", async ({ page, baseURL }) => {
  await serveBothOrigins(page, baseURL!);
  // Données déjà présentes sur la nouvelle adresse.
  await page.goto(`${OFFICIAL}/transfert/`);
  await page.evaluate(() => localStorage.setItem("mundi:bookmarks", JSON.stringify(["actualite:deja-la"])));

  // Données de l'ancienne adresse, dans son propre stockage.
  await page.goto(`${LEGACY}/transfert/`);
  await page.evaluate((d) => { for (const [k, v] of Object.entries(d)) localStorage.setItem(k, v); }, SAVED);
  await page.reload();
  await expect(page.getByTestId("transfer")).toHaveAttribute("data-mode", "legacy");
  await expect(page.getByTestId("transfer-summary")).toContainText("1 article enregistré");
  await expect(page.getByTestId("transfer-summary")).toContainText("1 dossier suivi");
  await page.getByTestId("transfer-send").click();

  // Arrivée sur la nouvelle adresse : confirmation demandée, données absentes de l'adresse affichée ensuite.
  await page.waitForURL(`${OFFICIAL}/transfert/**`);
  await expect(page.getByTestId("transfer-pending")).toContainText("1 carte de « Réviser »");
  expect(new URL(page.url()).hash).toBe("");
  await page.getByTestId("transfer-import").click();
  await expect(page.getByTestId("transfer-done")).toBeVisible();
  const after = await page.evaluate(() => ({
    bookmarks: JSON.parse(localStorage.getItem("mundi:bookmarks") ?? "[]"),
    follows: Object.keys(JSON.parse(localStorage.getItem("mundi:follows:v1") ?? "{}")),
    theme: localStorage.getItem("mundi:theme"),
  }));
  expect(after).toEqual({ bookmarks: ["actualite:deja-la", "actualite:ancien-favori"], follows: ["cobalt-congolais"], theme: "dark" });

  // L'ancienne adresse garde ses données et note le transfert ; un second envoi ne crée aucun doublon.
  await page.goto(`${LEGACY}/transfert/`);
  expect(await page.evaluate(() => localStorage.getItem("mundi:transfert"))).toBeTruthy();
  await page.getByTestId("transfer-send").click();
  await page.waitForURL(`${OFFICIAL}/transfert/**`);
  await page.getByTestId("transfer-import").click();
  await expect(page.getByTestId("transfer-done")).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("mundi:bookmarks") ?? "[]"))).toEqual(["actualite:deja-la", "actualite:ancien-favori"]);

  // La Bibliothèque de la nouvelle adresse montre le dossier suivi importé.
  await page.goto(`${OFFICIAL}/enregistres/`);
  await expect(page.getByText("Récupérez vos favoris et dossiers suivis")).toBeVisible();
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("fichier de sauvegarde : import refusé s'il n'est pas reconnu, accepté sinon", async ({ page }) => {
  await page.goto("/transfert/");
  await expect(page.getByTestId("transfer")).toHaveAttribute("data-mode", "official");
  await page.getByTestId("transfer-file").setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from("{\"autre\":1}") });
  await expect(page.getByTestId("transfer").getByRole("alert")).toContainText("pas une sauvegarde MUNDI");
  const pkg = { format: "mundi-transfert", version: 1, exportedAt: "2026-11-27T15:00:00.000Z", from: LEGACY, data: { "mundi:topics:v1": ["afrique"] } };
  await page.getByTestId("transfer-file").setInputFiles({ name: "mundi.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(pkg)) });
  await expect(page.getByTestId("transfer-pending")).toContainText("1 sujet choisi");
  await page.getByTestId("transfer-import").click();
  await expect(page.getByTestId("transfer-done")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("mundi:topics:v1"))).toBe("[\"afrique\"]");
});
