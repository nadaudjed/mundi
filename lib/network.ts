"use client";

import { useSyncExternalStore } from "react";

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };

function connection(): Connection | undefined {
  return (navigator as Navigator & { connection?: Connection }).connection;
}

function snapshot(): boolean {
  const c = connection();
  return !!c && (c.saveData === true || c.effectiveType === "slow-2g" || c.effectiveType === "2g");
}

function subscribe(cb: () => void) {
  const c = connection();
  c?.addEventListener("change", cb);
  return () => c?.removeEventListener("change", cb);
}

/**
 * Vrai si l'appareil demande d'économiser les données (mode « économie de
 * données ») ou si le réseau est très lent (2G). Les vidéos ne se lancent
 * alors plus toutes seules. Non disponible sur Safari et Firefox : faux par défaut.
 */
export function useSaveData(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
