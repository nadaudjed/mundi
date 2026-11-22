import type { NextConfig } from "next";

// Export statique : le site est un ensemble de fichiers HTML/CSS/JS
// hébergeable tel quel sur Netlify, sans serveur ni base de données.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
