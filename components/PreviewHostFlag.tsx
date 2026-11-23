"use client";

import { useEffect } from "react";
import { isNetlifyPreviewHost } from "@/lib/preview-host";

/**
 * Remet la marque « aperçu Netlify » sur <html> après l'hydratation
 * (React retire les attributs ajoutés avant lui par le script d'en-tête).
 */
export function PreviewHostFlag() {
  useEffect(() => {
    if (isNetlifyPreviewHost(window.location.hostname)) document.documentElement.setAttribute("data-netlify-preview", "");
  }, []);
  return null;
}
