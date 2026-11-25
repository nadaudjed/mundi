import type { IconName } from "./Icon";

/**
 * Quatre entrées, identiques sur téléphone (barre du bas) et sur ordinateur (en-tête).
 * Mes sujets (réglages) n'est plus un onglet : il est dans l'en-tête, à la même URL.
 * Bibliothèque mène aux contenus enregistrés.
 */
export const navItems: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/explorer/", label: "Explorer", icon: "compass" },
  { href: "/reviser/", label: "Réviser", icon: "check" },
  { href: "/enregistres/", label: "Bibliothèque", icon: "bookmark" },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/fil") || pathname.startsWith("/recit");
  return pathname.startsWith(href.replace(/\/$/, ""));
}
