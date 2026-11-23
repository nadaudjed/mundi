"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { isActive, navItems } from "./navItems";

/**
 * Barre d'onglets flottante (téléphones). Elle laisse libre le coin bas-droit
 * quand la page est un aperçu Netlify (variable --corner-safe), pour que
 * l'outil de relecture de Netlify ne cache jamais un onglet.
 */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      data-testid="dock"
      data-dock
      className="fixed bottom-[calc(var(--dock-gap)+env(safe-area-inset-bottom))] left-[max(0.5rem,env(safe-area-inset-left))] right-[calc(max(0.5rem,env(safe-area-inset-right))+var(--corner-safe))] z-40"
    >
      <ul className="mx-auto grid h-[var(--dock-h)] max-w-[30rem] grid-cols-5 md:max-w-[28rem] gap-0.5 rounded-[1.35rem] bg-night/92 p-1 shadow-[0_10px_30px_-8px_rgba(16,29,48,0.55)] ring-1 ring-white/10 backdrop-blur-xl">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 rounded-[1.05rem] px-0.5 text-[0.65rem] leading-none max-[359px]:text-[0.58rem] font-semibold transition-colors ${
                  active ? "bg-mint/15 text-mint-soft" : "text-ivory/70 hover:bg-white/5 hover:text-ivory"
                }`}
              >
                <Icon name={active && item.icon === "bookmark" ? "bookmark-filled" : item.icon} className="size-[1.3rem] shrink-0" />
                <span className="dock-label max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
