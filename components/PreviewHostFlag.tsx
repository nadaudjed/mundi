"use client";

import { useEffect } from "react";
import { isNetlifyHost } from "@/lib/preview-host";

/**
 * Remet la marque « adresse Netlify » sur <html> après l'hydratation
 * (React retire les attributs ajoutés avant lui par le script d'en-tête).
 */
export function PreviewHostFlag() {
  useEffect(() => {
    if (isNetlifyHost(window.location.hostname)) document.documentElement.setAttribute("data-netlify-host", "");
  }, []);
  return null;
}
