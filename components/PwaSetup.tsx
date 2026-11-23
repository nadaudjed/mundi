"use client";

import { useEffect } from "react";
import "@/lib/install";

/** Enregistre le service worker (site publié uniquement, pas en développement). */
export function PwaSetup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Pas de service worker (navigation privée, navigateur ancien) : le site fonctionne quand même.
    });
  }, []);
  return null;
}
