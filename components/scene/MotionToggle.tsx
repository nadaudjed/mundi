"use client";

import { useEffect, useSyncExternalStore } from "react";

const KEY = "mundi:motion-paused";
const ATTR = "data-motion-paused";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}
const isPaused = () => document.documentElement.hasAttribute(ATTR);

function setPaused(paused: boolean) {
  document.documentElement.toggleAttribute(ATTR, paused);
  try {
    localStorage.setItem(KEY, paused ? "1" : "0");
  } catch {
    /* stockage indisponible : réglage non retenu */
  }
  listeners.forEach((l) => l());
}

/**
 * Bouton « Pause » des décors animés (WCAG 2.2.2) : suspend les mouvements de
 * fond de tout le fil (attribut sur <html>). Le choix est retenu sur l'appareil,
 * et tous les boutons du fil restent synchronisés.
 */
export function MotionToggle({ className = "" }: { className?: string }) {
  const paused = useSyncExternalStore(subscribe, isPaused, () => false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1" && !isPaused()) setPaused(true);
    } catch {
      /* ignoré */
    }
  }, []);

  return (
    <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} className={`underline underline-offset-2 ${className}`} data-testid="motion-toggle">
      {paused ? "Reprendre le décor" : "Mettre le décor en pause"}
    </button>
  );
}
