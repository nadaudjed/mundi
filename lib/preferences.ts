"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { TopicSlug } from "./types";

/** Préférences conservées sur cet appareil. Aucune donnée envoyée à un serveur. */
const KEY = "mundi:topics:v1";
const EMPTY: TopicSlug[] = [];
const listeners = new Set<() => void>();
let cache: TopicSlug[] | null = null;
let cachedRaw: string | null = null;

const TOPICS: TopicSlug[] = [
  "geopolitique", "economie", "finance", "industrie", "materiaux-critiques",
  "energie", "recyclage", "environnement", "technologie", "entreprises",
  "afrique", "sciences-societe",
];

function read(): TopicSlug[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null;
  try { raw = window.localStorage.getItem(KEY); } catch { raw = null; }
  if (cache && raw === cachedRaw) return cache;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed)
      ? [...new Set(parsed.filter((v): v is TopicSlug => typeof v === "string" && TOPICS.includes(v as TopicSlug)))]
      : EMPTY;
  } catch { cache = EMPTY; }
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) { cache = null; listener(); }
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

function write(topics: TopicSlug[]) {
  const next = [...new Set(topics.filter(t => TOPICS.includes(t)))];
  const raw = JSON.stringify(next);
  cachedRaw = raw;
  cache = next;
  try { window.localStorage.setItem(KEY, raw); } catch { /* navigation privée */ }
  listeners.forEach(l => l());
}

export function useInterests() {
  const interests = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toggle = useCallback((topic: TopicSlug) => {
    const current = read();
    write(current.includes(topic) ? current.filter(t => t !== topic) : [...current, topic]);
  }, []);
  const reset = useCallback(() => write([]), []);
  return { interests, toggle, reset };
}

/** Priorité aux centres d'intérêt sans enfermer l'utilisateur dans une bulle.
 * Un récit sur trois reste hors des sujets favoris, lorsqu'il en existe.
 */
export function personalized<T extends { topic: TopicSlug }>(items: readonly T[], interests: TopicSlug[]): T[] {
  if (!interests.length) return [...items];
  const priority = items.filter(s => interests.includes(s.topic));
  const discovery = items.filter(s => !interests.includes(s.topic));
  const result: T[] = [];
  while (priority.length || discovery.length) {
    for (let i = 0; i < 2 && priority.length; i++) result.push(priority.shift()!);
    if (discovery.length) result.push(discovery.shift()!);
    if (!priority.length && discovery.length) result.push(...discovery.splice(0));
  }
  return result;
}
