"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DemoBadge } from "./DemoBadge";
import { InstallChip } from "./InstallButton";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { isActive, navItems } from "./navItems";

/**
 * En-tête affiché sur tablette et ordinateur. Sur tablette (768 à 1023 px),
 * il ne garde que le logo et les onglets pour que tout tienne sur une ligne.
 */
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header data-site-header className="sticky top-0 z-40 hidden h-16 border-b border-night/10 bg-ivory md:block">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-4 px-5 lg:gap-6 lg:px-6">
        <Logo />
        <span className="hidden lg:inline-flex">
          <DemoBadge />
        </span>
        <span className="hidden lg:inline-flex">
          <InstallChip tone="dark" />
        </span>
        <nav aria-label="Navigation principale" className="ml-auto min-w-0">
          <ul className="flex items-center gap-0.5 rounded-full bg-night/[0.04] p-1 ring-1 ring-night/8">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors lg:px-4 ${
                      active ? "bg-night text-ivory shadow-sm" : "text-night/75 hover:bg-night/5 hover:text-night"
                    }`}
                  >
                    <Icon name={active && item.icon === "bookmark" ? "bookmark-filled" : item.icon} className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
