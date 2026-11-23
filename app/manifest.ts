import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** Manifeste de l'application installable (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MUNDI — Comprendre le monde",
    short_name: "MUNDI",
    description: "Comprendre le monde n'a jamais été aussi simple. Prototype : contenus illustratifs.",
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#101D30",
    theme_color: "#101D30",
    categories: ["news", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Explorer", url: "/explorer/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Enregistrés", url: "/enregistres/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
