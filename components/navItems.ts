import type { IconName } from "./Icon";

export const navItems: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Fil", icon: "home" },
  { href: "/explorer/", label: "Explorer", icon: "compass" },
  { href: "/enregistres/", label: "Enregistrés", icon: "bookmark" },
  { href: "/mes-sujets/", label: "Mes sujets", icon: "sliders" },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/recit");
  return pathname.startsWith(href.replace(/\/$/, ""));
}
