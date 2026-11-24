/**
 * Thème clair / sombre. Par défaut, MUNDI suit le réglage de l'appareil
 * (prefers-color-scheme). Le lecteur peut forcer l'un ou l'autre ; ce choix
 * reste dans ce navigateur (localStorage, clé « mundi:theme »).
 */
export const THEME_KEY = "mundi:theme";
export type ThemeChoice = "light" | "dark";

/** Script exécuté avant l'affichage pour éviter un éclair de la mauvaise couleur. Doit rester autonome. */
export const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export function readTheme(): ThemeChoice | null {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

export function effectiveTheme(): ThemeChoice {
  const forced = readTheme();
  if (forced) return forced;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const EVENT = "mundi-theme-change";

/** Abonnement aux changements de thème (réglage de l'appareil ou bascule manuelle). */
export function subscribeTheme(cb: () => void) {
  const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
  mq?.addEventListener?.("change", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    mq?.removeEventListener?.("change", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function applyTheme(choice: ThemeChoice) {
  document.documentElement.setAttribute("data-theme", choice);
  window.dispatchEvent(new Event(EVENT));
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* stockage indisponible : le choix vaut pour cette page seulement */
  }
}
