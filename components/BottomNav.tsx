"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { isActive, navItems } from "./navItems";

/**
 * Barre d'onglets du bas, sur téléphone uniquement (masquée à partir de 768 px), posée tout en bas de l'écran.
 * Quatre colonnes : les libellés restent entiers et à la même taille, même à 320 px de large.
 */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      data-testid="dock"
      data-dock
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-page pb-[env(safe-area-inset-bottom)] text-ink"
    >
      <ul className="mx-auto grid h-[var(--dock-h)] max-w-[32rem] grid-cols-4 px-[max(0.25rem,env(safe-area-inset-left))]">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full min-h-11 flex-col items-center justify-center gap-1 border-t-2 px-0.5 text-[0.75rem] leading-none font-medium whitespace-nowrap transition-colors ${
                  active ? "-mt-px border-accent text-ink" : "-mt-px border-transparent text-muted hover:text-ink"
                }`}
              >
                <Icon name={active && item.icon === "bookmark" ? "bookmark-filled" : item.icon} className="size-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
