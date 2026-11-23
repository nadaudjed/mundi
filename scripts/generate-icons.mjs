#!/usr/bin/env node
/**
 * Génère les icônes de l'application (PWA, écran d'accueil iOS/Android)
 * à partir du logo MUNDI dessiné en SVG. Usage : npm run icons:generate
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "../public/icons");
mkdirSync(out, { recursive: true });

/** Globe MUNDI centré ; `scale` = part du carré occupée par le logo. */
const icon = (size, scale, rounded) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="${rounded ? 7 : 0}" fill="#101D30"/>
  <g transform="translate(16 16) scale(${scale}) translate(-16 -16)">
    <circle cx="16" cy="16" r="10.5" fill="none" stroke="#246BCE" stroke-width="2.2"/>
    <ellipse cx="16" cy="16" rx="4.8" ry="10.5" fill="none" stroke="#20B99A" stroke-width="2"/>
    <path d="M5.5 16h21" stroke="#246BCE" stroke-width="2" stroke-linecap="round"/>
    <circle cx="22.5" cy="9.5" r="2.2" fill="#20B99A"/>
  </g>
</svg>`;

const targets = [
  ["icon-192.png", 192, 1, false],
  ["icon-512.png", 512, 1, false],
  // Icône « maskable » : le logo reste dans la zone de sécurité (80 % centraux).
  ["icon-maskable-512.png", 512, 0.72, false],
  ["apple-touch-icon.png", 180, 0.9, false],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, scale, rounded] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${icon(size, scale, rounded)}</body></html>`);
  await page.screenshot({ path: join(out, name), omitBackground: false });
  console.log(`✓ ${name}`);
}
writeFileSync(join(out, "icon.svg"), icon(512, 1, true).trim());
await browser.close();
