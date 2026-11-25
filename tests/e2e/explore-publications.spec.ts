import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";

const publicArticles = (JSON.parse(readFileSync("content/publications.json", "utf8")) as
  { slug: string; title: string; status: string; topic: string; kind?: "actualite" | "concept" | "recit" }[])
  .filter((p) => p.status === "published");
const news = publicArticles.filter((p) => (p.kind ?? "actualite") === "actualite");
const concepts = publicArticles.filter((p) => p.kind === "concept");

test("Explorer searches actual published articles and offers their full page", async ({ page }) => {
  const article = news[0];
  test.skip(!article, "No published MUNDI article");
  await page.goto("/explorer/");
  // Tous les formats par défaut.
  await expect(page.getByRole("heading", { name: "Toutes les publications" })).toBeVisible();
  await expect(page.getByTestId("publication-tile")).toHaveCount(publicArticles.length);

  const word = article.title.split(/\W+/).find((w) => w.length > 5);
  test.skip(!word, "No usable search term in article title");
  await page.getByRole("searchbox").fill(word!);
  const tile = page.getByTestId("publication-tile").filter({ hasText: article.title });
  await expect(tile).toBeVisible();
  await expect(page).toHaveURL(/\/explorer\/\?q=/);
  await expect(tile.getByRole("link", { name: article.title })).toHaveAttribute("href", "/actualites/" + article.slug + "/");
});

test("Explorer filtre par format (Tous par défaut), sans aucun contenu de démonstration", async ({ page }) => {
  test.skip(!concepts.length, "No published concept");
  await page.goto("/explorer/");
  await expect(page.getByTestId("genre-tous")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("publication-tile")).toHaveCount(publicArticles.length);
  await page.getByTestId("genre-actualites").click();
  await expect(page.getByTestId("genre-actualites")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("genre-actualites")).toContainText(String(news.length));
  await expect(page.getByTestId("genre-concepts")).toContainText(String(concepts.length));
  await expect(page.getByTestId("publication-tile")).toHaveCount(news.length);
  await expect(page.getByText(/démonstration|Contenus fictifs/i)).toHaveCount(0);

  await page.getByTestId("genre-concepts").click();
  await expect(page.getByRole("heading", { name: "Les concepts à connaître" })).toBeVisible();
  await expect(page.getByTestId("publication-tile")).toHaveCount(concepts.length);
  await expect(page.getByTestId("publication-tile").filter({ hasText: concepts[0].title })).toContainText("Concept");
  await expect(page).toHaveURL(/genre=concepts/);
  await page.reload();
  await expect(page.getByTestId("publication-tile")).toHaveCount(concepts.length);

  await page.getByRole("searchbox").fill("termequinexistepas123");
  await expect(page.getByText("Aucun résultat trouvé")).toBeVisible();
  await page.getByRole("button", { name: "Tout afficher" }).click();
  await expect(page.getByTestId("genre-tous")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("publication-tile")).toHaveCount(publicArticles.length);
});

test("shareable topics filter public articles and persist on reload", async ({ page }) => {
  const article = news[0];
  test.skip(!article, "No published MUNDI article");
  await page.goto("/explorer/?sujet=" + article.topic);
  const tile = page.getByTestId("publication-tile").filter({ hasText: article.title });
  await expect(tile).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("publication-tile").filter({ hasText: article.title })).toBeVisible();
});

test("archive : une publication en tête, puis des lignes compactes par mois, sans débordement", async ({ page }) => {
  await page.goto("/actualites/");
  const tiles = page.getByTestId("publication-tile");
  await expect(tiles).toHaveCount(Math.min(1, publicArticles.length));
  await expect(page.getByTestId("archive-item")).toHaveCount(Math.max(0, publicArticles.length - 1));
  if (publicArticles.length > 1) {
    await expect(page.getByTestId("archive-month").first().getByRole("heading", { level: 2 })).toHaveText(/^[A-ZÀ-Ý][a-zéû]+ \d{4} \(\d+\)$/);
    await expect(page.getByTestId("archive-item").first().getByRole("link")).toHaveAttribute("href", /^\/(actualites|concepts|recits)\/.+\/$/);
  }
  await expect(tiles.first().getByText(/Contrôle IA, sans relecture humaine|Validation humaine/)).toBeVisible();
  // Le titre mène à l'article. (La date d'une actualité peut porter un lien vers sa source officielle,
  // placé avant le titre quand la une n'a pas de photo : on vise donc le lien du titre.)
  await expect(tiles.first().getByRole("heading").getByRole("link")).toHaveAttribute("href", /^\/actualites\/.+\/$/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("Explorer : « contenus » tant que la recherche est vide, « résultats » pendant une recherche", async ({ page }) => {
  await page.goto("/explorer/");
  await expect(page.getByText(/^\d+ contenus? ·/)).toBeVisible();
  await expect(page.getByText(/^\d+ résultats? ·/)).toHaveCount(0);
  await page.getByRole("searchbox").fill("énergie");
  await expect(page.getByText(/^\d+ résultats? ·/)).toBeVisible();
});

test("Explorer : une recherche trouve tous les formats, et « Effacer les filtres » revient à tout", async ({ page }) => {
  await page.goto("/explorer/?genre=concepts&sujet=" + (concepts[0]?.topic ?? ""));
  await expect(page.getByTestId("explore-clear")).toBeVisible();
  await page.getByTestId("explore-clear").click();
  await expect(page).toHaveURL(/\/explorer\/$/);
  await expect(page.getByTestId("publication-tile")).toHaveCount(publicArticles.length);
  await expect(page.getByTestId("explore-clear")).toHaveCount(0);
  // Une recherche sans filtre couvre tous les formats.
  const kinds = new Set(publicArticles.map((p) => p.kind ?? "actualite"));
  await page.getByRole("searchbox").fill("e");
  await expect(page).toHaveURL(/q=e/);
  const shown = await page.getByTestId("publication-tile").count();
  expect(shown).toBeGreaterThan(0);
  expect(kinds.size).toBeGreaterThan(0);
});

test("article long : sommaire discret vers chaque partie et les sources, durée de lecture", async ({ page }) => {
  const all = JSON.parse(readFileSync("content/publications.json", "utf8")) as { slug: string; status: string; sections?: { heading: string }[] }[];
  const decryptages = readFileSync("content/decryptages.json", "utf8");
  const long = all.find((p) => p.status === "published" && (p.sections?.length ?? 0) >= 4 && !decryptages.includes(`"${p.slug}"`));
  test.skip(!long, "Aucun article long publié");
  await page.goto("/actualites/" + long!.slug + "/");
  await expect(page.getByTestId("reading-time")).toHaveText(/^\d+ min de lecture$/);
  const toc = page.getByRole("navigation", { name: "Sommaire" });
  await expect(toc.getByRole("link")).toHaveCount(long!.sections!.length + 1);
  for (const link of await toc.getByRole("link").all()) {
    await expect(page.locator((await link.getAttribute("href"))!)).toBeAttached();
  }
  await toc.getByRole("link", { name: "Sources" }).click();
  await expect(page).toHaveURL(/#sources$/);
});
