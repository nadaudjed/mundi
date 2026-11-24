import { expect, test } from "./fixtures";

// Notifications d'édition : interrupteur dans « Mes sujets », jamais de demande sans un toucher.
test.describe("Notifications d'édition", () => {
  test("sans clés configurées sur le serveur, l'interrupteur explique que ce n'est pas encore disponible", async ({ page }) => {
    // Sans fonction Netlify (ou sans clés), /api/push répond { enabled: false }.
    await page.goto("/mes-sujets/");
    await expect(page.getByTestId("notifications")).toHaveAttribute("data-state", "unavailable");
    await expect(page.getByTestId("notifications")).toContainText("pas encore disponibles");
  });

  test("activer puis désactiver : l'abonnement est envoyé, puis retiré", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Web Push simulé sous Chromium");
    const calls: { method: string; body: unknown }[] = [];
    await page.route("**/api/push", async (route) => {
      const req = route.request();
      if (req.method() === "GET") return route.fulfill({ json: { enabled: true, publicKey: "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U" } });
      calls.push({ method: req.method(), body: req.postDataJSON() });
      return route.fulfill({ status: req.method() === "POST" ? 201 : 200, json: { ok: true } });
    });
    // Le service de notifications réel n'est pas joignable en test : abonnement simulé.
    await page.addInitScript(() => {
      // Accord simulé : la demande ne part qu'au toucher de l'interrupteur.
      let permission: NotificationPermission = "default";
      Object.defineProperty(Notification, "permission", { get: () => permission });
      Notification.requestPermission = async () => (permission = "granted");
      let current: PushSubscription | null = null;
      const fake = {
        endpoint: "https://push.example/abonnement-de-test",
        toJSON: () => ({ endpoint: "https://push.example/abonnement-de-test", keys: { p256dh: "cle", auth: "secret" } }),
        unsubscribe: async () => { current = null; return true; },
      } as unknown as PushSubscription;
      PushManager.prototype.subscribe = async () => (current = fake);
      PushManager.prototype.getSubscription = async () => current;
    });
    await page.goto("/mes-sujets/");
    const toggle = page.getByRole("switch", { name: "Prévenez-moi quand une édition sort" });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("notifications")).toContainText("C'est activé");
    expect(calls[0]).toEqual({ method: "POST", body: { subscription: { endpoint: "https://push.example/abonnement-de-test", keys: { p256dh: "cle", auth: "secret" } } } });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(calls[1]).toEqual({ method: "DELETE", body: { endpoint: "https://push.example/abonnement-de-test" } });
  });
});
