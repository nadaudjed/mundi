import type { NextConfig } from "next";

// Export statique : le site est un ensemble de fichiers HTML/CSS/JS, servi par Cloudflare Workers
// (fichiers statiques, plus un petit Worker pour /api/push : voir wrangler.jsonc et worker/).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Adresse officielle remplaçable au build (#129), lue aussi dans le navigateur (bouton Partager).
  env: { MUNDI_SITE_URL: process.env.MUNDI_SITE_URL ?? "" },
};

export default nextConfig;
