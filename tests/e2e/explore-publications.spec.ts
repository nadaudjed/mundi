import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";

const publicArticles = (JSON.parse(readFileSync("content/publications.json", "utf8")) as
  { slug: string; title: string; status: string; topic: string }[])
  .filter((p) => p.status === "published");

test("Explorer searches actual published articles and offers their full page", async ({ page }) => {
  const article = publicArticles[0];
  test.skip(!article, "No published MUNDI article");
  await page.goto("/explorer/");
  await expect(page.getByRole("heading", { name: "Les publications à découvrir" })).toBeVisible();
  await expect(page.getByTestId("publication-tile")).toHaveCount(publicArticles.length);

  const word = article.title.split(/\W+/).find((w) => w.length > 5);
  test.skip(!word, "No usable search term in article title");
  await page.getByRole("searchbox").fill(word!);
  const tile = page.getByTestId("publication-tile").filter({ hasText: article.title });
  await expect(tile).toBeVisible();
  await expect(page).toHaveURL(/\/explorer\/\?q=/);
  await expect(tile.getByRole("link", { name: /Lire l'article/ })).toHaveAttribute("href", "/actualites/" + article.slug + "/");
});

test("real publications and fictional demonstrations are visibly separated", async ({ page }) => {
  await page.goto("/explorer/");
  await expect(page.getByRole("heading", { name: "Récits de démonstration" })).toBeVisible();
  await expect(page.getByText(/Contenus fictifs/).first()).toBeVisible();
  await expect(page.getByTestId("publication-tile")).toHaveCount(publicArticles.length);
  await page.getByRole("searchbox").fill("termequinexistepas123");
  await expect(page.getByText("Aucun résultat trouvé")).toBeVisible();
  await page.getByRole("button", { name: "Tout afficher" }).click();
  await expect(page.getByTestId("publication-tile")).toHaveCount(publicArticles.length);
});

test("shareable topics filter public articles and persist on reload", async ({ page }) => {
  const article = publicArticles[0];
  test.skip(!article, "No published MUNDI article");
  await page.goto("/explorer/?sujet=" + article.topic);
  const tile = page.getByTestId("publication-tile").filter({ hasText: article.title });
  await expect(tile).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("publication-tile").filter({ hasText: article.title })).toBeVisible();
});

test("news homepage uses image-rich cards with honest review labels and no overflow", async ({ page }) => {
  await page.goto("/actualites/");
  const tiles = page.getByTestId("publication-tile");
  await expect(tiles).toHaveCount(publicArticles.length);
  await expect(tiles.first().getByText(/Contrôle IA, sans relecture humaine|Validation humaine/)).toBeVisible();
  await expect(tiles.first().getByRole("link", { name: /Lire l'article/ })).toHaveAttribute("href", /^\/actualites\/.+\/$/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
