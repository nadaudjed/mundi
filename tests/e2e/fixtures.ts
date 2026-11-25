import { readFileSync } from "node:fs";
import { selectToday } from "../../lib/today";
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

/**
 * Édition « Aujourd'hui » du site normal (pilote, ticket 109) : ses sujets sont en tête du Fil
 * et ne réapparaissent pas plus bas (ni leurs cartes de données).
 */
const livePublications = (JSON.parse(readFileSync("content/publications.json", "utf8")) as { slug: string; status: string; publishedAt: string; dataCards?: unknown[]; dataCardsInFeed?: boolean }[]).filter((p) => p.status === "published");
export const TODAY_SLUGS: string[] = selectToday(livePublications, JSON.parse(readFileSync("content/aujourdhui.json", "utf8"))).map((p) => p.publication.slug);
/** Premier écran « ordinaire » du Fil sur le site normal, après l'édition du jour. */
export const FIRST_FEED_INDEX = TODAY_SLUGS.length;
/** Cartes de données visibles dans le Fil du site normal (hors sujets du jour). */
export const LIVE_FEED_DATA_CARDS = livePublications
  .filter((p) => p.dataCardsInFeed !== false && !TODAY_SLUGS.includes(p.slug))
  .reduce((n, p) => n + (p.dataCards?.length ?? 0), 0);

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1024) < 768;

/** Fait défiler le fil jusqu'à l'écran n (0 = premier). */
export async function scrollFeedTo(page: Page, index: number) {
  await page.locator(`[data-index="${index}"]`).scrollIntoViewIfNeeded();
  await expect(page.locator(`[data-index="${index}"]`)).toBeInViewport({ ratio: 0.9 });
}
