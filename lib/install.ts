"use client";

import { useSyncExternalStore } from "react";

/**
 * Installation de l'application (PWA).
 * Chrome / Edge / Android : l'événement `beforeinstallprompt` permet
 * d'afficher la fenêtre d'installation du navigateur. Safari iOS ne le
 * propose pas : on affiche alors les étapes manuelles (Partager → Sur l'écran d'accueil).
 */
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export type InstallState = "unknown" | "installed" | "available" | "ios" | "manual";

let deferred: PromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as PromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installedNow = true;
    emit();
  });
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function snapshot(): InstallState {
  if (installedNow || isStandalone()) return "installed";
  if (deferred) return "available";
  if (isIos()) return "ios";
  return "manual";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, snapshot, () => "unknown");
}

/** Ouvre la fenêtre d'installation du navigateur, si elle est disponible. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  emit();
  return outcome;
}
