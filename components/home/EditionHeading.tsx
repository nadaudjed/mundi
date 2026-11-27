"use client";

import type { TodayState } from "@/lib/today";
import { formatDate } from "@/lib/format";
import { useEditionDayPassed } from "@/lib/use-edition-day";

/** Libellé de l'édition selon son état (#125). */
export function editionHeading(state: TodayState, title?: string): string {
  if (state === "a-jour") return title ?? "Aujourd'hui";
  if (state === "sans-nouveaute") return "Dernière édition";
  return "Les plus récentes";
}

/**
 * En-tête daté de l'édition. Rendu tel que calculé au build ; si le jour change à Paris pendant que
 * la page est servie (site statique), une sélection « du jour » devient « Dernière édition » avec sa date.
 */
export function EditionHeading({ state, title, date, builtFor, selectionDate }: { state: TodayState; title?: string; date: string; builtFor: string; selectionDate?: string }) {
  const passed = useEditionDayPassed(builtFor);
  const effective: TodayState = passed && state === "a-jour" ? "sans-nouveaute" : state;
  return (
    <>
      <p className="text-[0.75rem] font-semibold tracking-[0.12em] text-accent uppercase" data-testid="home-edition-heading" data-state={effective} data-edition-today={builtFor}>
        {editionHeading(effective, title)}
        {date && <span className="ml-2 font-normal tracking-normal text-muted normal-case" data-testid="home-edition-date">{date}</span>}
      </p>
      {passed && state === "a-jour" && selectionDate && (
        <p className="mt-3 max-w-2xl border-l-2 border-accent pl-3 text-[0.85rem] leading-relaxed text-ink" data-testid="home-edition-notice" data-state="jour-passe">
          Sélection de la rédaction du {formatDate(selectionDate)}. La prochaine édition arrive.
        </p>
      )}
    </>
  );
}
