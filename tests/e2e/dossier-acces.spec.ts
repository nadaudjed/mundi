import { expect, test } from "./fixtures";

/** Accès aux dossiers depuis Explorer et l'accueil (demande du 26 novembre, suite de #120). */
const DOSSIER = "/dossiers/cobalt-congolais/";
const TITLE = "Cobalt congolais : qui capte la valeur entre la mine et la batterie ?";

for (const width of [320, 390]) {
  test(`à ${width} px : Explorer → Dossiers → Cobalt → Suivre ce dossier → Bibliothèque → Dossiers suivis`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/explorer/");
    const filter = page.getByTestId("genre-dossiers");
    // Le filtre est lisible : entièrement dans l'écran une fois amené en vue, texte non tronqué.
    await filter.scrollIntoViewIfNeeded();
    const row = (await page.getByTestId("explore-genres").boundingBox())!;
    const fb = (await filter.boundingBox())!;
    expect(fb.x).toBeGreaterThanOrEqual(row.x - 1);
    expect(fb.x + fb.width).toBeLessThanOrEqual(row.x + row.width + 1);
    await expect(filter).toContainText("Dossiers");
    expect(await filter.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    const box = (await filter.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    await filter.click();
    await expect(filter).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/genre=dossiers/);
    await expect(page.getByTestId("publication-tile")).toHaveCount(0);
    const tile = page.getByTestId("dossier-tile").filter({ hasText: TITLE });
    await expect(tile).toBeVisible();
    await tile.getByRole("link", { name: TITLE }).click();
    await expect(page).toHaveURL(new RegExp(DOSSIER + "$"));

    const button = page.getByTestId("dossier-follow").getByRole("button");
    await button.click();
    await expect(button).toHaveText("Arrêter de suivre ce dossier");

    await page.goto("/enregistres/");
    const followed = page.getByTestId("followed-dossiers");
    await expect(followed.getByRole("heading", { name: "Dossiers suivis" })).toBeVisible();
    await expect(followed.getByTestId("followed-dossier")).toContainText("Cobalt congolais");
  });
}

test("Explorer : « cobalt » trouve le dossier dans Tous et dans Dossiers", async ({ page }) => {
  await page.goto("/explorer/?q=cobalt");
  await expect(page.getByTestId("genre-tous")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("explore-dossiers").getByTestId("dossier-tile")).toHaveCount(1);
  await expect(page.getByTestId("dossier-tile").getByRole("link")).toHaveAttribute("href", DOSSIER);
  // Les articles sur le cobalt restent listés sous le dossier.
  expect(await page.getByTestId("publication-tile").count()).toBeGreaterThan(0);
  await page.getByTestId("genre-dossiers").click();
  await expect(page).toHaveURL(/q=cobalt.*genre=dossiers|genre=dossiers.*q=cobalt/);
  await expect(page.getByTestId("dossier-tile")).toHaveCount(1);
  // Un mot absent du dossier ne le montre pas.
  await page.getByRole("searchbox").fill("termequinexistepas123");
  await expect(page.getByTestId("dossier-tile")).toHaveCount(0);
  await expect(page.getByText("Aucun résultat trouvé")).toBeVisible();
});

test("Explorer : les adresses de filtres existantes ne montrent pas de dossier", async ({ page }) => {
  for (const genre of ["actualites", "recits", "concepts"]) {
    await page.goto(`/explorer/?genre=${genre}`);
    await expect(page.getByTestId(`genre-${genre}`)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("dossier-tile")).toHaveCount(0);
  }
});

test("accueil : un lien visible vers le dossier pilote", async ({ page }) => {
  await page.goto("/");
  const block = page.getByTestId("home-dossier");
  await expect(block.getByRole("link", { name: TITLE })).toHaveAttribute("href", DOSSIER);
  await block.scrollIntoViewIfNeeded();
  await expect(block).toBeVisible();
});
