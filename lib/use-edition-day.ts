"use client";

import { useEffect, useState } from "react";
import { parisDate } from "./today";

/**
 * Le site est statique (#125) : une page construite la veille resterait « Aujourd'hui » après minuit.
 * Ce crochet compare, dans le navigateur, la date de Paris à celle du build (`builtFor`) et renvoie
 * true dès que le jour a changé (vérifié au chargement, chaque minute et au retour sur l'onglet).
 * L'édition est alors présentée comme « Dernière édition », datée, jusqu'au prochain déploiement.
 */
export function useEditionDayPassed(builtFor: string | undefined): boolean {
  const [passed, setPassed] = useState(false);
  useEffect(() => {
    if (!builtFor) return;
    const check = () => setPassed(parisDate(new Date()) > builtFor);
    check();
    const timer = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [builtFor]);
  return passed;
}
