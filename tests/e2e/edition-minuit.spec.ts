import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";

/**
 * #125 (prévention durable) : le site est statique. Si minuit passe à Paris sans nouveau déploiement,
 * l'édition construite la veille ne doit plus se présenter comme « Aujourd'hui ».
 * Le site de test est construit pour le jour de content/aujourdhui.json (MUNDI_TEST_NOW, midi).
 */
const { edition } = JSON.parse(readFileSync("content/aujourdhui.json", "utf8")) as { edition: string };
const nextDay = new Date(Date.parse(`${edition}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

test("le jour même, l'accueil présente l'édition du jour", async ({ page }) => {
  await page.clock.setSystemTime(new Date(`${edition}T23:59:00+01:00`));
  await page.goto("/");
  const heading = page.getByTestId("home-edition-heading");
  await expect(heading).toHaveAttribute("data-edition-today", edition);
  await expect(heading).toHaveAttribute("data-state", "a-jour");
});

test("passé minuit à Paris, sans nouveau build : « Dernière édition », datée, sur l'accueil et dans le fil", async ({ page }) => {
  await page.clock.setSystemTime(new Date(`${nextDay}T00:01:00+01:00`));
  await page.goto("/");
  const heading = page.getByTestId("home-edition-heading");
  await expect(heading).toHaveAttribute("data-state", "sans-nouveaute");
  await expect(heading).toContainText("Dernière édition");
  await expect(page.locator('[data-testid="home-edition-notice"][data-state="jour-passe"]')).toBeVisible();
  await page.goto("/fil/");
  await expect(page.locator('[data-index="0"]')).toContainText("Dernière édition · 1/3");
});
