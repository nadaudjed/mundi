"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { DossierUpdate } from "./dossiers";

/**
 * « Suivre ce dossier » (ticket #120) : stocké sur l'appareil, sans compte ni notification.
 * Pour chaque dossier suivi : la date du suivi et les mises à jour déjà consultées.
 * Sur une preview seulement, des mises à jour simulées permettent de tester l'arrivée d'une nouveauté.
 */
const KEY = "mundi:follows:v1";
export type Follow = { followedAt: string; seen: string[]; simulated?: DossierUpdate[] };
type Store = Record<string, Follow>;
const EMPTY: Store = {};
const listeners = new Set<() => void>();
let cache: Store | null = null;
let cachedRaw: string | null | undefined;
/** Vrai si le dernier enregistrement a échoué (navigation privée, stockage plein ou bloqué). */
let failed = false;

function parse(raw: string | null): Store {
  try {
    const value: unknown = raw ? JSON.parse(raw) : {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: Store = {};
    for (const [id, f] of Object.entries(value as Record<string, unknown>)) {
      if (!f || typeof f !== "object") continue;
      const { followedAt, seen, simulated } = f as Partial<Follow>;
      if (typeof followedAt !== "string" || !Array.isArray(seen)) continue;
      out[id] = { followedAt, seen: seen.filter((s): s is string => typeof s === "string"), ...(Array.isArray(simulated) ? { simulated } : {}) };
    }
    return out;
  } catch {
    return {};
  }
}

function read(): Store {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null;
  try { raw = window.localStorage.getItem(KEY); } catch { return cache ?? EMPTY; }
  if (cache && raw === cachedRaw) return cache;
  // Écriture ratée : on garde l'état en mémoire plutôt que de relire un stockage vide.
  if (cache && failed) return cache;
  cachedRaw = raw;
  return (cache = parse(raw));
}

function write(next: Store) {
  cache = next;
  try {
    const raw = JSON.stringify(next);
    window.localStorage.setItem(KEY, raw);
    cachedRaw = raw;
    failed = false;
  } catch {
    failed = true;
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; listener(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

const readFailed = () => failed;

export function useFollows() {
  const follows = useSyncExternalStore(subscribe, read, () => EMPTY);
  const storageFailed = useSyncExternalStore(subscribe, readFailed, () => false);

  /** Suivre : les mises à jour déjà parues comptent comme vues. */
  const follow = useCallback((id: string, currentIds: string[]) => {
    write({ ...read(), [id]: { followedAt: new Date().toISOString(), seen: currentIds } });
  }, []);
  const unfollow = useCallback((id: string) => {
    const next = { ...read() };
    delete next[id];
    write(next);
  }, []);
  /** Marque comme consultées les mises à jour affichées. */
  const markSeen = useCallback((id: string, ids: string[]) => {
    const current = read()[id];
    if (!current || ids.every((x) => current.seen.includes(x))) return;
    write({ ...read(), [id]: { ...current, seen: [...new Set([...current.seen, ...ids])] } });
  }, []);
  /** Preview seulement : ajoute une mise à jour fictive, datée d'aujourd'hui. */
  const simulate = useCallback((id: string) => {
    const current = read()[id];
    if (!current) return null;
    const now = new Date();
    const update: DossierUpdate = {
      id: `simulation-${now.getTime()}`,
      date: now.toISOString().slice(0, 10),
      kind: "fait",
      text: "Exemple de mise à jour (preview uniquement) : un fait nouveau a été ajouté au dossier.",
    };
    write({ ...read(), [id]: { ...current, simulated: [...(current.simulated ?? []), update] } });
    return update.id;
  }, []);

  return { follows, storageFailed, follow, unfollow, markSeen, simulate };
}

/** Toutes les mises à jour d'un dossier pour ce lecteur : publiées, puis simulées (preview). */
export function withSimulated(updates: DossierUpdate[], follow?: Follow): DossierUpdate[] {
  return [...updates, ...(follow?.simulated ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}
