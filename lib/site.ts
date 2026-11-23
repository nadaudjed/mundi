/**
 * Adresse publique du site, pour les liens de partage (Open Graph).
 * Netlify fournit URL pendant la construction ; sinon, l'adresse actuelle du site.
 */
export const SITE_URL = process.env.URL || "https://mundiapptest.netlify.app";

/** Image affichée quand un lien MUNDI est partagé (1200 × 630). */
export const SHARE_IMAGE = { url: "/og/mundi.png", width: 1200, height: 630, alt: "MUNDI — Comprendre le monde n'a jamais été aussi simple." };

export const shareDefaults = {
  siteName: "MUNDI",
  locale: "fr_FR",
  images: [SHARE_IMAGE],
};
