"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./Icon";
import { applyTheme, effectiveTheme, subscribeTheme, type ThemeChoice } from "@/lib/theme";

/** Bascule manuelle clair / sombre. Sans choix, le site suit l'appareil. */
export function ThemeToggle({ className = "", withLabel = false }: { className?: string; withLabel?: boolean }) {
  const theme = useSyncExternalStore<ThemeChoice | null>(subscribeTheme, effectiveTheme, () => null);

  const next: ThemeChoice = theme === "dark" ? "light" : "dark";
  const label = next === "dark" ? "Passer en mode sombre" : "Passer en mode clair";
  if (withLabel) {
    return (
      <button type="button" onClick={() => applyTheme(next)} data-testid="theme-toggle" className={`btn btn-secondary ${className}`}>
        <Icon name={theme === "dark" ? "sun" : "moon"} className="size-4" />
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => applyTheme(next)}
      aria-label={label}
      title={label}
      data-testid="theme-toggle"
      className={`flex size-9 items-center justify-center rounded-sm text-ink hover:text-accent ${className}`}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} className="size-5" />
    </button>
  );
}
