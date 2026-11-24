import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";
const articles = (JSON.parse(readFileSync("content/publications.json", "utf8")) as
  { slug: string; title: string; status: string; kind?: "actualite" | "concept" }[]).filter((p) => p.status === "published");
const news = articles.filter((p) => (p.kind ?? "actualite") === "actualite");
const concepts = articles.filter((p) => p.kind === "concept");

test("review mode starts with the news, with verified evidence links", async ({ page }) => {
  const first = news[0];
  test.skip(!first, "No published article");
  await page.goto("/reviser/");
  await expect(page.getByRole("button", { name: /^Actualités/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: first.title })).toBeVisible();
  await expect(page.getByRole("link", { name: "Relire l'article et ses sources" })).toHaveAttribute("href", "/actualites/" + first.slug + "/");
  await page.getByRole("button", { name: "Révéler les 3 idées" }).click();
  const card = page.getByRole("region", { name: "Carte de révision" });
  await expect(card.locator("ol li")).toHaveCount(3);
  await page.getByRole("button", { name: "J'ai retenu" }).click();
  const key = "actualite:" + first.slug;
  await expect.poll(() => page.evaluate((key) => {
    const raw = localStorage.getItem("mundi:revision:v1");
    return raw ? Boolean(JSON.parse(raw)[key]) : false;
  }, key)).toBe(true);
});

test("concepts are reviewed separately, and no demonstration remains", async ({ page }) => {
  const first = concepts[0];
  test.skip(!first, "No published concept");
  await page.goto("/reviser/");
  await expect(page.getByRole("button", { name: /^Démonstrations/ })).toHaveCount(0);
  await page.getByRole("button", { name: /^Concepts/ }).click();
  await expect(page.getByRole("button", { name: /^Concepts/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: first.title })).toBeVisible();
  await expect(page.getByRole("region", { name: "Carte de révision" })).toContainText("Concept");
});
