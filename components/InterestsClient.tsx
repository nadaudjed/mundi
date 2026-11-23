"use client";

import Link from "next/link";
import { useInterests } from "@/lib/preferences";
import { topics } from "@/lib/topics";

export function InterestsClient() {
  const { interests, toggle, reset } = useInterests();

  return (
    <div className="mt-8">
      <section className="rounded-3xl bg-night p-6 text-ivory md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint">Votre sélection</p>
        <p className="mt-2 font-display text-3xl font-semibold">{interests.length} sujet{interests.length > 1 ? "s" : ""} favori{interests.length > 1 ? "s" : ""}</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/80">
          Vos choix influencent l'ordre du fil « Pour vous ». MUNDI continue d'intégrer
          d'autres sujets pour encourager la découverte et éviter les bulles d'information.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/" className="inline-flex rounded-full bg-mint px-5 py-2.5 text-sm font-semibold text-night hover:bg-mint-soft">Découvrir mon fil</Link>
          {interests.length > 0 && <button type="button" onClick={reset} className="rounded-full border border-ivory/40 px-5 py-2.5 text-sm font-medium hover:border-ivory">Réinitialiser</button>}
        </div>
      </section>
      <section aria-labelledby="choose-topics" className="mt-10">
        <h2 id="choose-topics" className="font-display text-2xl font-semibold text-night">Qu'est-ce qui vous intéresse ?</h2>
        <p className="mt-2 text-sm text-muted">Choisissez autant de sujets que vous le souhaitez. Vos préférences restent sur cet appareil.</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map(topic => {
            const chosen = interests.includes(topic.slug);
            return (
              <li key={topic.slug}>
                <button type="button" aria-pressed={chosen} onClick={() => toggle(topic.slug)}
                  className={"flex h-full w-full flex-col items-start rounded-2xl border p-5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue " +
                    (chosen ? "border-blue bg-blue/10 shadow-sm" : "border-night/10 bg-paper hover:border-blue/40")}>
                  <span className="mb-4 flex w-full items-center justify-between">
                    <span className="h-2 w-9 rounded-full" style={{ background: topic.color }} aria-hidden="true" />
                    <span aria-hidden="true" className={"flex size-6 items-center justify-center rounded-full border text-sm font-semibold " +
                      (chosen ? "border-blue bg-blue text-white" : "border-night/25 text-muted")}>{chosen ? "✓" : "+"}</span>
                  </span>
                  <span className="font-semibold text-night">{topic.name}</span>
                  <span className="mt-1 text-sm leading-relaxed text-muted">{topic.description}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <p className="mt-10 pb-8 text-sm text-muted">
        Pour comprendre notre démarche éditoriale, consultez la page <Link href="/a-propos/" className="font-semibold text-blue underline underline-offset-4">À propos</Link>.
      </p>
    </div>
  );
}
