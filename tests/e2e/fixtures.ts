import { test as base, expect, type Page } from "@playwright/test";

/**
 * Chaque test échoue si la page produit une erreur JavaScript ou une erreur
 * dans la console. La synthèse vocale est simulée pour rendre l'audio testable.
 */
export const test = base.extend<{ consoleErrors: string[]; allowedErrors: RegExp }>({
  /** Erreurs attendues dans un test donné (ex. : média volontairement bloqué). */
  allowedErrors: [/(?!)/, { option: true }],
  consoleErrors: [
    async ({ page, allowedErrors }, use) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));
      await page.addInitScript(() => {
        const spoken: string[] = [];
        (window as unknown as { __spoken: string[] }).__spoken = spoken;
        class FakeUtterance {
          text: string;
          lang = "";
          rate = 1;
          voice: unknown = null;
          onstart: (() => void) | null = null;
          onend: (() => void) | null = null;
          onerror: (() => void) | null = null;
          constructor(text: string) {
            this.text = text;
          }
        }
        let current: FakeUtterance | null = null;
        Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
        Object.defineProperty(window, "speechSynthesis", {
          configurable: true,
          value: {
            speaking: false,
            getVoices: () => [],
            speak(u: FakeUtterance) {
              current = u;
              spoken.push(u.text);
              this.speaking = true;
              queueMicrotask(() => { if (current === u) u.onstart?.(); });
            },
            cancel() {
              this.speaking = false;
              current = null;
            },
            /** Utilisé par les tests pour simuler la fin de la lecture. */
            finish() {
              this.speaking = false;
              current?.onend?.();
            },
          },
        });
      });
      await use(errors);
      const unexpected = errors.filter((e) => !allowedErrors.test(e));
      expect(unexpected, "aucune erreur dans la console").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1024) < 768;

/** Fait défiler le fil jusqu'à l'écran n (0 = premier). */
export async function scrollFeedTo(page: Page, index: number) {
  await page.locator(`[data-index="${index}"]`).scrollIntoViewIfNeeded();
  await expect(page.locator(`[data-index="${index}"]`)).toBeInViewport({ ratio: 0.9 });
}
