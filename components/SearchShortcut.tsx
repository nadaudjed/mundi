"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

const FOCUS_FLAG = "mundi:focus-search";

/** Après un raccourci depuis une autre page, Explorer place le curseur dans le champ de recherche. */
export function consumeSearchFocus(): boolean {
  try {
    const v = sessionStorage.getItem(FOCUS_FLAG);
    if (v) sessionStorage.removeItem(FOCUS_FLAG);
    return v === "1";
  } catch {
    return false;
  }
}

function isTyping(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

/**
 * Ouvre la recherche au clavier : « / », Ctrl+K, ou Cmd+K sur Mac.
 * Sur Explorer, le champ reçoit le curseur ; ailleurs, on y va.
 */
export function SearchShortcut() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const combo = (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey) && !e.altKey;
      const slash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target);
      if (!combo && !slash) return;
      e.preventDefault();
      const field = document.getElementById("search");
      if (field instanceof HTMLInputElement) {
        field.focus();
        field.select();
        return;
      }
      try {
        sessionStorage.setItem(FOCUS_FLAG, "1");
      } catch {
        /* sans stockage, on ouvre simplement Explorer */
      }
      router.push("/explorer/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, pathname]);
  return null;
}
