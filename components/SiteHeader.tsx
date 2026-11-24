"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { InstallChip } from "./InstallButton";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { isActive, navItems } from "./navItems";

/**
 * En-tête des pages.
 * Tablette et ordinateur : barre de rubriques classique, identique sur toutes
 * les pages (Fil compris), onglet actif souligné.
 * Téléphone : barre fine avec le logo, sous l'heure et l'encoche de l'iPhone ;
 * les onglets sont dans la barre du bas, et le Fil n'a pas cette barre.
 */
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header data-site-header className="sticky top-0 z-40 border-b border-rule bg-page pt-[env(safe-area-inset-top)] text-ink">
      <div className="mx-auto flex h-[var(--header-bar-h)] max-w-6xl items-stretch gap-6 px-5 lg:px-8">
        <span className="flex items-center">
          <Logo />
        </span>
        <nav aria-label="Navigation principale" className="hidden min-w-0 items-stretch md:flex">
          <ul className="flex items-stretch gap-1 lg:gap-3">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="flex">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center border-b-2 px-2 pt-0.5 text-sm font-medium whitespace-nowrap transition-colors ${
                      active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <span className="hidden lg:inline-flex">
            <InstallChip tone="dark" />
          </span>
          <ThemeToggle />
          <Link href="/explorer/" aria-label="Rechercher (raccourci : / ou Ctrl+K)" className="flex size-9 items-center justify-center rounded-sm text-ink hover:text-accent">
            <Icon name="search" className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
