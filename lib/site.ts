/**
 * Adresses du site (ticket #129).
 * - OFFICIAL_SITE_URL : l'adresse officielle de MUNDI, servie par Cloudflare Workers.
 * - LEGACY_SITE_URL : l'ancienne adresse Netlify. Elle ne sert plus qu'à rediriger vers l'adresse
 *   officielle et à laisser les lecteurs récupérer leurs données locales (/transfert/).
 * MUNDI_SITE_URL (variable de build) peut remplacer l'adresse officielle, par exemple pour un domaine
 * personnalisé. La variable URL fournie par Netlify n'est plus utilisée : sur Netlify, les liens de
 * partage et les adresses canoniques doivent eux aussi désigner Cloudflare.
 */
export const OFFICIAL_SITE_URL = "https://mundi.nadaudjacques004.workers.dev";
export const LEGACY_SITE_URL = "https://mundiapptest.netlify.app";

const configured = process.env.MUNDI_SITE_URL || "";
// Une ancienne valeur netlify.app est ignorée : elle remettrait l'ancienne adresse dans les liens de partage.
export const SITE_URL = (configured && !/\.netlify\.app/.test(configured) ? configured : OFFICIAL_SITE_URL).replace(/\/+$/, "");

/** Image affichée quand un lien MUNDI est partagé (1200 × 630). */
export const SHARE_IMAGE = { url: "/og/mundi.png", width: 1200, height: 630, alt: "MUNDI — Comprendre le monde n'a jamais été aussi simple." };

export const shareDefaults = {
  siteName: "MUNDI",
  locale: "fr_FR",
  images: [SHARE_IMAGE],
};
