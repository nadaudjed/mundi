"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "mundi:revision:v1";
const EMPTY: Record<string, ReviewStatus> = {};
const listeners = new Set<() => void>();
export type ReviewStatus = { level: number; nextAt: string; lastAt: string };
let cache: Record<string, ReviewStatus> | null = null;
let cachedRaw: string | null = null;

function read(): Record<string, ReviewStatus> {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null;
  try { raw = localStorage.getItem(KEY); } catch { raw = null; }
  if (cache && cachedRaw === raw) return cache;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return (cache = EMPTY);
    const result: Record<string, ReviewStatus> = {};
    for (const [slug, v] of Object.entries(parsed)) {
      if (v && typeof v === "object" && "level" in v && "nextAt" in v && "lastAt" in v) {
        const value = v as ReviewStatus;
        if (Number.isInteger(value.level) && value.level >= 0 && value.level <= 5 &&
            typeof value.nextAt === "string" && typeof value.lastAt === "string") result[slug] = value;
      }
    }
    return (cache = result);
  } catch { return (cache = EMPTY); }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) { cache = null; listener(); }
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

function save(next: Record<string, ReviewStatus>) {
  cache = next;
  cachedRaw = JSON.stringify(next);
  try { localStorage.setItem(KEY, cachedRaw); } catch { /* stockage indisponible */ }
  listeners.forEach(l => l());
}

const DAYS = [0, 1, 3, 7, 14, 30];
function nextDate(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

export function useRevision() {
  const records = useSyncExternalStore(subscribe, read, () => EMPTY);
  const mark = useCallback((slug: string, remembered: boolean) => {
    const current = read();
    const level = remembered ? Math.min(5, (current[slug]?.level ?? 0) + 1) : 0;
    save({ ...current, [slug]: {
      level, nextAt: nextDate(remembered ? DAYS[level] : 0), lastAt: new Date().toISOString(),
    } });
  }, []);
  const reset = useCallback(() => save({}), []);
  return { records, mark, reset };
}
