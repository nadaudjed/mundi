"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DemoBadge } from "./DemoBadge";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { isActive, navItems } from "./navItems";

/** En-tête affiché sur tablette et ordinateur. */
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 hidden h-16 border-b border-night/10 bg-ivory/85 backdrop-blur-md md:block">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-6 px-6">
        <Logo />
        <DemoBadge />
        <nav aria-label="Navigation principale" className="ml-auto">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      active ? "bg-night text-ivory" : "text-night/75 hover:bg-night/5 hover:text-night"
                    }`}
                  >
                    <Icon name={item.icon} className="size-4" />
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
