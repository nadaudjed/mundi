#!/usr/bin/env node
/**
 * Génère la bibliothèque de médias de démonstration de MUNDI.
 *
 * Tous les fichiers produits sont des CRÉATIONS ORIGINALES : ils sont
 * dessinés par ce script (SVG), photographiés image par image avec le
 * navigateur Chromium de Playwright, puis encodés avec ffmpeg.
 * Aucune image, vidéo ou police tierce sous droits n'est utilisée
 * (les polices DM Sans et Fraunces sont sous licence SIL Open Font License).
 *
 * Usage : npm run media:generate   (nécessite ffmpeg et Chromium/Playwright)
 * Sortie : public/media/demo/
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public/media/demo");
mkdirSync(out, { recursive: true });

const font = (p) => readFileSync(join(root, "node_modules", p)).toString("base64");
const css = `
@font-face{font-family:"DM Sans";src:url(data:font/woff2;base64,${font("@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2")}) format("woff2");font-weight:100 1000}
@font-face{font-family:"Fraunces";src:url(data:font/woff2;base64,${font("@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2")}) format("woff2");font-weight:100 900}
html,body{margin:0;padding:0;background:#101D30}svg{display:block}
.s{font-family:"DM Sans",sans-serif}.d{font-family:"Fraunces",serif}`;

const C = { night: "#101D30", night2: "#16273F", blue: "#246BCE", ivory: "#F3F0E8", mint: "#20B99A", amber: "#E0A43A", coral: "#E46B4F" };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const seg = (t, a, b) => ease(clamp((t - a) / (b - a)));

function frame(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.35" r="0.9"><stop offset="0" stop-color="#1f3352"/><stop offset="1" stop-color="${C.night}"/></radialGradient>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#ffffff" opacity="0.05"/></pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/><rect width="${w}" height="${h}" fill="url(#dots)"/>
  ${body}</svg>`;
}

const tag = (x, y, text) =>
  `<g><rect x="${x}" y="${y}" width="${text.length * 11 + 36}" height="38" rx="19" fill="${C.amber}" fill-opacity="0.16" stroke="${C.amber}" stroke-opacity="0.6"/>
   <circle cx="${x + 20}" cy="${y + 19}" r="4" fill="${C.amber}"/><text x="${x + 32}" y="${y + 25}" class="s" font-size="16" font-weight="700" letter-spacing="1.5" fill="#ffd98f">${text}</text></g>`;

/* ------------------------------------------------------------------ */
/* Vidéo 1 : l'équilibre du réseau électrique (8 s, 720×1280)          */
/* ------------------------------------------------------------------ */
function gridScene(t) {
  const W = 720, H = 1280;
  const demand = seg(t, 2.2, 3.6) * (1 - seg(t, 5.0, 6.4));
  const battery = seg(t, 4.6, 5.6);
  const wobble = Math.sin(t * 2.4) * 1.2 * (1 - demand);
  const tilt = demand * 13 + wobble; // degrés, positif = côté consommation qui descend
  const cx = 360, cy = 610, arm = 230;
  const rad = (tilt * Math.PI) / 180;
  const lx = cx - Math.cos(rad) * arm, ly = cy - Math.sin(rad) * arm;
  const rx = cx + Math.cos(rad) * arm, ry = cy + Math.sin(rad) * arm;
  const needle = -90 + tilt * 4.2; // jauge : verticale = référence
  const gx = 360, gy = 1050;
  const nx = gx + Math.cos((needle * Math.PI) / 180) * 120, ny = gy + Math.sin((needle * Math.PI) / 180) * 120;
  const off = Math.abs(tilt) > 4;
  const houses = 2 + Math.round(demand * 2);

  const pan = (x, y, label, color, content) => `
    <line x1="${x}" y1="${y}" x2="${x}" y2="${y + 70}" stroke="${C.ivory}" stroke-opacity="0.5" stroke-width="3"/>
    <path d="M ${x - 110} ${y + 70} h 220 l -30 34 h -160 z" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="3"/>
    <g transform="translate(${x} ${y + 62})">${content}</g>
    <text x="${x}" y="${y + 146}" text-anchor="middle" class="s" font-size="44" font-weight="600" fill="${C.ivory}">${label}</text>`;

  const sun = `<g transform="translate(-72 -40)"><circle r="22" fill="${C.amber}"/>${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="-32" x2="0" y2="-42" stroke="${C.amber}" stroke-width="4" stroke-linecap="round" transform="rotate(${i * 45 + t * 30})"/>`).join("")}</g>
    <g transform="translate(62 -30)"><line x1="0" y1="0" x2="0" y2="-60" stroke="${C.ivory}" stroke-width="4"/>
    <g transform="translate(0 -60) rotate(${t * 140})">${[0, 120, 240].map((a) => `<path d="M0 0 L -5 -38 Q 0 -44 5 -38 Z" fill="${C.ivory}" transform="rotate(${a})"/>`).join("")}</g></g>
    ${battery > 0 ? `<g transform="translate(-6 -6) scale(${battery * 0.8})" opacity="${battery}"><rect x="-26" y="-58" width="52" height="58" rx="8" fill="${C.mint}"/><rect x="-10" y="-66" width="20" height="9" rx="3" fill="${C.mint}"/><path d="M4 -48 l-14 20 h10 l-6 18 l16 -24 h-10 z" fill="${C.night}"/></g>` : ""}`;
  const homes = Array.from({ length: houses }, (_, i) => {
    const x = -75 + i * 50;
    return `<g transform="translate(${x} -2)"><path d="M -18 0 v -26 l 18 -16 l 18 16 v 26 z" fill="${C.blue}" stroke="${C.ivory}" stroke-opacity="0.7" stroke-width="2"/><rect x="-6" y="-14" width="12" height="14" fill="${C.ivory}" fill-opacity="0.85"/></g>`;
  }).join("");

  // Pas de titre dans la vidéo : la carte MUNDI l'affiche déjà. Le schéma
  // occupe le haut de l'image pour laisser la place au texte de la carte.
  return frame(W, H, `<g transform="translate(108 -98) scale(0.7)">
    <path d="M ${cx} ${cy} l -40 260 h 80 z" fill="${C.ivory}" fill-opacity="0.12" stroke="${C.ivory}" stroke-opacity="0.35" stroke-width="2"/>
    <line x1="${lx}" y1="${ly}" x2="${rx}" y2="${ry}" stroke="${C.ivory}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="14" fill="${C.ivory}"/>
    ${pan(lx, ly, "Production", C.mint, sun)}
    ${pan(rx, ry, "Consommation", C.blue, homes)}
    <path d="M ${gx - 150} ${gy} A 150 150 0 0 1 ${gx + 150} ${gy}" fill="none" stroke="${C.ivory}" stroke-opacity="0.2" stroke-width="22" stroke-linecap="round"/>
    <path d="M ${gx - 26} ${gy - 148} A 150 150 0 0 1 ${gx + 26} ${gy - 148}" fill="none" stroke="${C.mint}" stroke-width="22"/>
    <line x1="${gx}" y1="${gy}" x2="${nx}" y2="${ny}" stroke="${off ? C.amber : C.mint}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="${gx}" cy="${gy}" r="12" fill="${C.ivory}"/>
    <text x="${gx}" y="${gy + 56}" text-anchor="middle" class="s" font-size="44" font-weight="600" fill="${C.ivory}">Fréquence du réseau</text>
    <text x="${gx}" y="${gy + 92}" text-anchor="middle" class="s" font-size="37" fill="${off ? "#ffd98f" : C.mint}">${off ? "S'éloigne de la référence" : "Proche de la référence"}</text>
    </g>`);
}

/* ------------------------------------------------------------------ */
/* Vidéo 2 : un détroit, point de passage obligé (8 s, 720×1280)        */
/* ------------------------------------------------------------------ */
function straitScene(t) {
  const W = 720, H = 1280;
  const blocked = seg(t, 3.2, 3.8);
  // Route directe (par le détroit) et route de contournement.
  const direct = "M 120 300 C 260 420, 330 560, 360 640 S 470 860, 600 980";
  const detour = "M 120 300 C 40 520, 60 900, 220 1060 S 560 1120, 600 980";
  const ships = Array.from({ length: 5 }, (_, i) => {
    const p = ((t * 0.16 + i * 0.2) % 1);
    return { p, onDetour: blocked > 0.5 && p > 0.0 };
  });
  // Les navires sont placés sur leur route après rendu (voir placeShips).
  const shipAt = (path, p, color) => `<circle class="ship" data-route="${path === detour ? "detour" : "direct"}" data-p="${p.toFixed(4)}" r="13" fill="${color}"/>`;
  const delay = 0.18 + blocked * 0.62;
  return frame(W, H, `<g transform="translate(180 140) scale(0.5)">
    <!-- masses terrestres abstraites -->
    <path d="M 0 470 C 120 460, 250 520, 330 610 L 330 680 C 250 760, 120 820, 0 800 Z" fill="${C.ivory}" fill-opacity="0.1" stroke="${C.ivory}" stroke-opacity="0.3" stroke-width="2"/>
    <path d="M 720 420 C 600 430, 470 520, 392 610 L 392 680 C 470 790, 600 840, 720 850 Z" fill="${C.ivory}" fill-opacity="0.1" stroke="${C.ivory}" stroke-opacity="0.3" stroke-width="2"/>
    <path id="direct" d="${direct}" fill="none" stroke="${C.blue}" stroke-width="4" stroke-dasharray="10 12" opacity="${1 - blocked * 0.6}"/>
    <path id="detour" d="${detour}" fill="none" stroke="${C.amber}" stroke-width="4" stroke-dasharray="10 12" opacity="${blocked}"/>
    ${blocked > 0 ? `<g opacity="${blocked}"><rect x="318" y="600" width="86" height="90" rx="14" fill="${C.coral}" fill-opacity="0.25" stroke="${C.coral}" stroke-width="3"/><path d="M 338 620 l 46 50 M 384 620 l -46 50" stroke="${C.coral}" stroke-width="6" stroke-linecap="round"/></g>` : ""}
    ${ships.map((s) => shipAt(s.onDetour ? detour : direct, s.p, s.onDetour ? C.amber : C.mint)).join("")}
    <circle cx="120" cy="300" r="10" fill="${C.ivory}"/><circle cx="600" cy="980" r="10" fill="${C.ivory}"/>
    <text x="140" y="292" class="s" font-size="37" fill="${C.ivory}" fill-opacity="0.8">Départ</text>
    <text x="580" y="1030" text-anchor="end" class="s" font-size="37" fill="${C.ivory}" fill-opacity="0.8">Arrivée</text>
    <text x="48" y="1120" class="s" font-size="41" font-weight="600" fill="${C.ivory}">Durée du trajet</text>
    <rect x="48" y="1140" width="624" height="20" rx="10" fill="${C.ivory}" fill-opacity="0.15"/>
    <rect x="48" y="1140" width="${624 * delay}" height="20" rx="10" fill="${blocked > 0.5 ? C.amber : C.mint}"/>
    </g>`);
}

/* ------------------------------------------------------------------ */
/* Illustrations fixes (1080×1350)                                      */
/* ------------------------------------------------------------------ */
function metalsIllustration() {
  const W = 1080, H = 1350;
  const tiles = [["Li", "Lithium", C.mint], ["Co", "Cobalt", C.blue], ["Ni", "Nickel", C.amber], ["Nd", "Néodyme", C.coral]];
  const steps = ["Extraction", "Raffinage", "Fabrication"];
  return frame(W, H, `
    ${tag(72, 80, "ILLUSTRATION")}
    <text x="72" y="236" class="s" font-size="30" font-weight="700" letter-spacing="5" fill="#C98A4B">MATÉRIAUX CRITIQUES</text>
    ${tiles.map(([s, n, c], i) => {
      const x = 72 + (i % 2) * 480, y = 300 + Math.floor(i / 2) * 290;
      return `<g><rect x="${x}" y="${y}" width="456" height="262" rx="36" fill="${c}" fill-opacity="0.14" stroke="${c}" stroke-width="3"/>
        <text x="${x + 40}" y="${y + 150}" class="d" font-size="120" font-weight="600" fill="${C.ivory}">${s}</text>
        <text x="${x + 40}" y="${y + 216}" class="s" font-size="34" fill="${C.ivory}" fill-opacity="0.8">${n}</text></g>`;
    }).join("")}
    ${steps.map((s, i) => {
      const x = 72 + i * 330;
      return `<g><rect x="${x}" y="960" width="276" height="120" rx="60" fill="${i === 1 ? C.amber : C.ivory}" fill-opacity="${i === 1 ? 0.25 : 0.1}" stroke="${i === 1 ? C.amber : C.ivory}" stroke-opacity="0.6" stroke-width="3"/>
        <text x="${x + 138}" y="1032" text-anchor="middle" class="s" font-size="34" font-weight="600" fill="${C.ivory}">${s}</text>
        ${i < 2 ? `<path d="M ${x + 286} 1020 h 34 m -12 -12 l 12 12 l -12 12" stroke="${C.ivory}" stroke-width="4" fill="none" stroke-linecap="round"/>` : ""}</g>`;
    }).join("")}
    <text x="72" y="1160" class="s" font-size="30" fill="${C.ivory}" fill-opacity="0.75">Chaque étape peut être concentrée dans peu de pays.</text>
    <text x="72" y="1290" class="s" font-size="24" fill="${C.ivory}" fill-opacity="0.5">Illustration originale MUNDI · sans données</text>`);
}

function batteryIllustration() {
  const W = 1080, H = 1350;
  const stages = [
    ["Batterie usagée", `<rect x="-70" y="-110" width="140" height="210" rx="22" fill="none" stroke="${C.ivory}" stroke-width="6"/><rect x="-28" y="-130" width="56" height="22" rx="6" fill="${C.ivory}"/><rect x="-48" y="40" width="96" height="40" rx="8" fill="${C.coral}"/>`],
    ["Broyage", `<circle r="70" fill="none" stroke="${C.ivory}" stroke-width="6"/>${Array.from({ length: 8 }, (_, i) => `<path d="M 0 -70 l 14 -22 l 14 22" fill="${C.ivory}" transform="rotate(${i * 45})"/>`).join("")}`],
    ["« Masse noire »", `${Array.from({ length: 26 }, (_, i) => `<circle cx="${Math.cos(i * 2.4) * (20 + (i % 5) * 12)}" cy="${Math.sin(i * 2.4) * (16 + (i % 4) * 12)}" r="${6 + (i % 3) * 3}" fill="#55606f" stroke="${C.ivory}" stroke-opacity="0.5"/>`).join("")}`],
    ["Métaux récupérés", `${[C.mint, C.blue, C.amber].map((c, i) => `<rect x="${-80 + i * 56}" y="${-40 - i * 14}" width="46" height="${90 + i * 14}" rx="10" fill="${c}"/>`).join("")}`],
  ];
  return frame(W, H, `
    ${tag(72, 80, "ILLUSTRATION")}
    <text x="72" y="236" class="s" font-size="30" font-weight="700" letter-spacing="5" fill="${C.mint}">RECYCLAGE</text>
    ${stages.map(([label, icon], i) => {
      const x = i % 2 === 0 ? 300 : 780, y = 420 + i * 210;
      return `<g><circle cx="${x}" cy="${y}" r="120" fill="${C.ivory}" fill-opacity="0.06" stroke="${C.mint}" stroke-opacity="0.5" stroke-width="3"/>
        <g transform="translate(${x} ${y}) scale(0.8)">${icon}</g>
        <text x="${i % 2 === 0 ? x + 150 : x - 150}" y="${y + 12}" text-anchor="${i % 2 === 0 ? "start" : "end"}" class="s" font-size="36" font-weight="600" fill="${C.ivory}">${label}</text></g>`;
    }).join("")}
    ${[0, 1, 2].map((i) => {
      const a = { x: i % 2 === 0 ? 300 : 780, y: 420 + i * 210 }, b = { x: i % 2 === 0 ? 780 : 300, y: 420 + (i + 1) * 210 };
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), k = 128 / L;
      return `<line x1="${a.x + dx * k}" y1="${a.y + dy * k}" x2="${b.x - dx * k}" y2="${b.y - dy * k}" stroke="${C.mint}" stroke-width="4" stroke-dasharray="10 12"/>`;
    }).join("")}
    <text x="72" y="1290" class="s" font-size="24" fill="${C.ivory}" fill-opacity="0.5">Illustration originale MUNDI · schéma simplifié</text>`);
}

function correlationIllustration() {
  const W = 1080, H = 1350;
  const curve = (off, amp) => Array.from({ length: 41 }, (_, i) => {
    const x = 120 + i * 21;
    const y = 980 - (i / 40) * 380 - Math.sin(i / 3) * amp + off;
    return `${i ? "L" : "M"} ${x} ${y.toFixed(1)}`;
  }).join(" ");
  return frame(W, H, `
    ${tag(72, 80, "ILLUSTRATION")}
    <text x="72" y="236" class="s" font-size="30" font-weight="700" letter-spacing="5" fill="#9C8CF0">SCIENCES &amp; SOCIÉTÉ</text>
    <g transform="translate(860 400)"><circle r="70" fill="${C.amber}"/>${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="-92" x2="0" y2="-118" stroke="${C.amber}" stroke-width="8" stroke-linecap="round" transform="rotate(${i * 30})"/>`).join("")}</g>
    <path d="M 860 500 C 820 640, 760 700, 700 720" stroke="${C.amber}" stroke-width="4" fill="none" stroke-dasharray="8 10"/>
    <path d="M 860 500 C 900 700, 900 800, 860 860" stroke="${C.amber}" stroke-width="4" fill="none" stroke-dasharray="8 10"/>
    <line x1="120" y1="1040" x2="980" y2="1040" stroke="${C.ivory}" stroke-opacity="0.4" stroke-width="3"/>
    <path d="${curve(0, 22)}" fill="none" stroke="${C.mint}" stroke-width="8" stroke-linecap="round"/>
    <path d="${curve(70, 18)}" fill="none" stroke="#9C8CF0" stroke-width="8" stroke-linecap="round"/>
    <text x="120" y="1110" class="s" font-size="32" fill="${C.mint}">— Ventes de glaces</text>
    <text x="560" y="1110" class="s" font-size="32" fill="#9C8CF0">— Coups de soleil</text>
    <text x="72" y="1200" class="s" font-size="30" fill="${C.ivory}" fill-opacity="0.75">Un troisième facteur, le soleil, explique les deux.</text>
    <text x="72" y="1290" class="s" font-size="24" fill="${C.ivory}" fill-opacity="0.5">Illustration originale MUNDI · courbes sans données réelles</text>`);
}

/* ------------------------------------------------------------------ */

async function render(page, svg, w, h, path, type = "png") {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${svg}</body></html>`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    // placeShips : positionne chaque navire le long de sa route.
    document.querySelectorAll(".ship").forEach((el) => {
      const route = document.getElementById(el.dataset.route);
      const pt = route.getPointAtLength(route.getTotalLength() * Number(el.dataset.p));
      el.setAttribute("cx", pt.x);
      el.setAttribute("cy", pt.y);
    });
  });
  await page.screenshot({ path, type, ...(type === "jpeg" ? { quality: 92 } : {}) });
}

async function video(page, name, scene, seconds = 8, fps = 24) {
  const tmp = mkdtempSync(join(tmpdir(), `mundi-${name}-`));
  const frames = seconds * fps;
  for (let i = 0; i < frames; i++) {
    await render(page, scene(i / fps), 720, 1280, join(tmp, `f${String(i).padStart(4, "0")}.png`));
  }
  const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);
  ff(["-framerate", String(fps), "-i", join(tmp, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "26", "-preset", "slow", "-movflags", "+faststart", "-an", join(out, `${name}.mp4`)]);
  // WebM (VP9) en plus du MP4 : lisible par les navigateurs sans codec H.264 (Chromium libre, Firefox sous Linux…).
  ff(["-framerate", String(fps), "-i", join(tmp, "f%04d.png"), "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "40", "-row-mt", "1", "-pix_fmt", "yuv420p", "-an", join(out, `${name}.webm`)]);
  ff(["-i", join(tmp, "f0000.png"), "-q:v", "4", join(out, `${name}-poster.jpg`)]);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`✓ ${name}.mp4 / .webm (+ poster)`);
}

const browser = await chromium.launch();
const page = await browser.newPage();

if (process.env.PREVIEW_DIR) {
  // Aperçu rapide de quelques images clés, sans encoder les vidéos.
  for (const [n, f] of [["grid-1", gridScene(1)], ["grid-4", gridScene(3.8)], ["strait-1", straitScene(1)], ["strait-6", straitScene(6)]]) {
    await render(page, f, 720, 1280, join(process.env.PREVIEW_DIR, `${n}.png`));
  }
  await browser.close();
  process.exit(0);
}

await video(page, "reseau-electrique", gridScene);
// Poster plus parlant : image au milieu de l'animation.
await render(page, gridScene(3.8), 720, 1280, join(out, "reseau-electrique-poster.jpg"), "jpeg");
await video(page, "detroit", straitScene);
await render(page, straitScene(0.6), 720, 1280, join(out, "detroit-poster.jpg"), "jpeg");

for (const [name, svg] of [["metaux-critiques", metalsIllustration()], ["recyclage-batterie", batteryIllustration()], ["correlation", correlationIllustration()]]) {
  await render(page, svg, 1080, 1350, join(out, `${name}.jpg`), "jpeg");
  console.log(`✓ ${name}.jpg`);
}

await browser.close();
writeFileSync(join(out, "README.md"), `# Médias de démonstration MUNDI

Fichiers générés par \`scripts/generate-demo-media.mjs\` (commande \`npm run media:generate\`).

- **Provenance :** créations originales dessinées par le code du dépôt MUNDI, rendues avec Chromium et encodées avec ffmpeg.
- **Droits :** propriété du projet MUNDI. Aucune photo, vidéo, musique ou illustration tierce n'est utilisée.
- **Polices :** DM Sans et Fraunces, sous licence SIL Open Font License 1.1.
- **Contenu :** schémas illustratifs, sans données réelles ni événement d'actualité.
- Les sous-titres (\`.vtt\`) sont rédigés à la main dans \`public/media/demo/\`.
`);
