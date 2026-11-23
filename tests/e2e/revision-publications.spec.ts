import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";
const articles = (JSON.parse(readFileSync("content/publications.json", "utf8")) as
  { slug: string; title: string; status: string }[]).filter((p) => p.status === "published");

test("review mode prioritizes real published articles with verified evidence links", async ({ page }) => {
  const first = articles[0];
  test.skip(!first, "No published article");
  await page.goto("/reviser/");
  await expect(page.getByRole("button", { name: /^Publications/ })).toHaveAttribute("aria-pressed", "true");
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

test("demo revision stays available and does not mix progress with published articles", async ({ page }) => {
  await page.goto("/reviser/");
  await page.getByRole("button", { name: /^Démonstrations/ }).click();
  await expect(page.getByRole("button", { name: /^Démonstrations/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Entraînement sur des récits pédagogiques fictifs", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Révéler les 3 idées" }).click();
  await page.getByRole("button", { name: "J'ai retenu" }).click();
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("mundi:revision:v1");
    const keys = raw ? Object.keys(JSON.parse(raw)) : [];
    return keys.some((k) => !k.startsWith("actualite:"));
  })).toBe(true);
});
