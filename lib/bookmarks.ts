"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Enregistrements stockés localement dans le navigateur (localStorage).
 * Aucun compte ni serveur : suffisant pour la démonstration.
 */
const KEY = "mundi:bookmarks";
const listeners = new Set<() => void>();
const EMPTY: string[] = [];
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: string[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Stockage indisponible (navigation privée...) : on garde l'état en mémoire.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useBookmarks() {
  const saved = useSyncExternalStore(subscribe, read, () => EMPTY);

  const toggle = useCallback((slug: string) => {
    const current = read();
    write(current.includes(slug) ? current.filter((s) => s !== slug) : [slug, ...current]);
  }, []);

  const clear = useCallback(() => write([]), []);

  return { saved, isSaved: (slug: string) => saved.includes(slug), toggle, clear };
}
