"use client";

import Link from "next/link";
import { useInterests } from "@/lib/preferences";
import { topics } from "@/lib/topics";

export function InterestsClient() {
  const { interests, toggle, reset } = useInterests();
  const n = interests.length;

  return (
    <div className="mt-6">
      <p className="max-w-2xl text-base leading-relaxed text-ink" data-testid="interests-summary">
        {n === 0 ? "Aucune rubrique choisie : le fil suit l'ordre de la rédaction." : <><span className="font-mono">{n}</span> rubrique{n > 1 ? "s" : ""} choisie{n > 1 ? "s" : ""}.</>}{" "}
        <span className="text-muted">MUNDI continue de proposer les autres rubriques, pour éviter les bulles d&apos;information.</span>
      </p>
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link href="/" className="font-semibold text-accent underline-offset-4 hover:underline">Voir mon fil</Link>
        {n > 0 && <button type="button" onClick={reset} className="font-medium text-muted underline-offset-4 hover:text-ink hover:underline">Réinitialiser</button>}
      </p>

      <section aria-labelledby="choose-topics" className="mt-10">
        <h2 id="choose-topics" className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">Rubriques</h2>
        <ul className="grid sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
          {topics.map((topic) => {
            const chosen = interests.includes(topic.slug);
            return (
              <li key={topic.slug} className="border-b border-rule">
                <button type="button" aria-pressed={chosen} onClick={() => toggle(topic.slug)}
                  className="flex w-full items-start gap-3 py-3.5 text-left">
                  <span aria-hidden="true" className={"mt-1 flex size-4 shrink-0 items-center justify-center rounded-xs border " + (chosen ? "border-accent bg-accent text-white" : "border-rule-strong")}>
                    {chosen && <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6.5l2.2 2.2 4.8-5" /></svg>}
                  </span>
                  <span className="min-w-0">
                    <span className={"font-display text-lg leading-tight font-semibold " + (chosen ? "text-accent" : "text-ink")}>{topic.name}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-muted">{topic.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <p className="mt-10 pb-8 text-sm text-muted">
        Pour comprendre notre démarche éditoriale, consultez la page <Link href="/a-propos/" className="font-semibold text-accent underline underline-offset-4">À propos</Link>.
      </p>
    </div>
  );
}
