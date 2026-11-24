"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { isActive, navItems } from "./navItems";

/**
 * Barre d'onglets du bas, sur téléphone uniquement (masquée à partir de 768 px).
 * Sur les adresses *.netlify.app, elle remonte au-dessus du bandeau de Netlify
 * (variable --badge-safe), pour qu'il ne cache jamais un onglet.
 */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      data-testid="dock"
      data-dock
      className="fixed inset-x-0 bottom-[calc(var(--dock-gap)+var(--badge-safe))] z-40 border-t border-rule bg-page pb-[env(safe-area-inset-bottom)] text-ink"
    >
      <ul className="mx-auto grid h-[var(--dock-h)] max-w-[32rem] grid-cols-5 px-[max(0.25rem,env(safe-area-inset-left))]">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 border-t-2 px-0.5 text-[0.68rem] leading-none font-medium max-[359px]:text-[0.6rem] transition-colors ${
                  active ? "-mt-px border-accent text-ink" : "-mt-px border-transparent text-muted hover:text-ink"
                }`}
              >
                <Icon name={active && item.icon === "bookmark" ? "bookmark-filled" : item.icon} className="size-5 shrink-0" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
