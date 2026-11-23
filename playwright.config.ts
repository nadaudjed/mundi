import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout sur le site statique (dossier out/).
 * `npm run test:e2e` construit le site, le sert localement puis lance
 * les scénarios sur un téléphone (Pixel 7) et un ordinateur (1440×900).
 */
const PORT = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    locale: "fr-FR",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "npm run build && node scripts/serve-static.mjs",
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
});
