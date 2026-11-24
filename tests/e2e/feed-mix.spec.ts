import { expect, test } from "./fixtures";

/** Ordre du Fil « Pour vous » : la suite des publications (cartes de données comprises). */
async function feedOrder(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.locator('[data-index="0"]')).toBeVisible();
  // Le mélange s'applique juste après le chargement : attendre qu'il soit stable.
  await page.waitForFunction(() => sessionStorage.getItem("mundi:feed-seed") !== null);
  await page.waitForTimeout(300);
  return page.locator("[data-index]").evaluateAll((els) =>
    els.map((e) => `${(e as HTMLElement).dataset.testid}:${(e as HTMLElement).dataset.publication}:${(e as HTMLElement).dataset.topic ?? ""}`),
  );
}

test.describe("Fil un peu aléatoire", () => {
  test("l'ordre change d'une visite à l'autre, la tête et les cartes de données restent en place", async ({ browser }) => {
    const a = await browser.newContext();
    const b = await browser.newContext();
    const orderA = await feedOrder(await a.newPage());
    const orderB = await feedOrder(await b.newPage());
    await a.close();
    await b.close();

    expect(orderA.length).toBe(orderB.length);
    expect(orderA[0]).toBe(orderB[0]);
    expect(orderA).not.toEqual(orderB);
    expect([...orderA].sort()).toEqual([...orderB].sort());

    for (const order of [orderA, orderB]) {
      const cards = order.filter((e) => e.startsWith("verified-card"));
      // Deux publications du même sujet ne se suivent jamais.
      for (let i = 1; i < cards.length; i++) expect(cards[i].split(":")[2]).not.toBe(cards[i - 1].split(":")[2]);
      // Chaque carte de données suit sa publication (ou une autre carte de la même publication).
      order.forEach((e, i) => {
        if (!e.startsWith("data-card")) return;
        expect(order[i - 1].split(":")[1]).toBe(e.split(":")[1]);
      });
    }
  });

  test("le même onglet garde le même ordre après un rechargement", async ({ page }) => {
    const before = await feedOrder(page);
    await page.evaluate(() => sessionStorage.removeItem("mundi:feed-position"));
    const after = await feedOrder(page);
    expect(after).toEqual(before);
  });
});
