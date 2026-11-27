"use client";

import { useCallback, useSyncExternalStore } from "react";
import { currentSlug } from "./redirections";

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
    const list: string[] = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
    cache = migrate(list);
  } catch {
    cache = [];
  }
  return cache;
}

const PREFIX = "actualite:";
/**
 * Un article fusionné avec un autre (#125) garde ses favoris : la clé de l'ancien article est remplacée
 * par celle de la publication de référence, sans doublon. Les autres clés sont inchangées.
 */
export function migrate(list: string[]): string[] {
  const out: string[] = [];
  for (const key of list) {
    const next = key.startsWith(PREFIX) ? PREFIX + currentSlug(key.slice(PREFIX.length)) : key;
    if (!out.includes(next)) out.push(next);
  }
  return out;
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
  /** Remet une liste (annulation d'un retrait ou d'un effacement). */
  const restore = useCallback((list: string[]) => write(list), []);

  return { saved, isSaved: (slug: string) => saved.includes(slug), toggle, clear, restore };
}
