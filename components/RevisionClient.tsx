"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRevision } from "@/lib/revision";
import { stories } from "@/lib/stories";
import { getTopic } from "@/lib/topics";

export function RevisionClient() {
  const { records, mark, reset } = useRevision();
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [now] = useState(() => Date.now());
  const due = useMemo(() => stories.filter(s => !records[s.slug] || new Date(records[s.slug].nextAt).getTime() <= now), [records, now]);
  const mastered = stories.filter(s => (records[s.slug]?.level ?? 0) >= 3).length;
  const learned = stories.filter(s => Boolean(records[s.slug])).length;
  const story = due.find(s => s.slug === selected) ?? due[0] ?? null;

  function grade(remembered: boolean) {
    if (!story) return;
    mark(story.slug, remembered);
    setSelected(null);
    setRevealed(false);
  }

  return (
    <div className="mt-8">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="À réviser" value={due.length} />
        <Stat label="Déjà étudiés" value={learned} />
        <Stat label="Bien retenus" value={mastered} />
      </div>
      <section className="mt-8 rounded-3xl bg-night p-6 text-ivory md:p-9" aria-label="Carte de révision">
        {story ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Carte mémoire · {getTopic(story.topic)?.name}</p>
            <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold leading-tight md:text-4xl">{story.title}</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ivory/75">
              Essayez de rappeler à voix haute les trois idées essentielles avant de révéler la réponse.
            </p>
            {revealed ? (
              <div className="mt-7">
                <h3 className="text-sm font-semibold text-mint-soft">Les trois idées à retenir</h3>
                <ol className="mt-4 space-y-4">
                  {story.keyPoints.map((point, i) => (
                    <li key={i} className="flex gap-3 text-base leading-relaxed">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-mint/15 text-sm font-semibold text-mint">{i + 1}</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-6 text-xs text-ivory/60">Auto-évaluation : indiquez si vous avez réussi à retrouver les idées principales.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => grade(false)} className="rounded-full border border-ivory/40 px-5 py-3 text-sm font-semibold hover:bg-ivory/10">À revoir</button>
                  <button type="button" onClick={() => grade(true)} className="rounded-full bg-mint px-5 py-3 text-sm font-semibold text-night hover:bg-mint-soft">J&apos;ai retenu</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setRevealed(true)} className="mt-8 rounded-full bg-mint px-6 py-3 text-sm font-semibold text-night hover:bg-mint-soft">
                Révéler les 3 idées
              </button>
            )}
            <p className="mt-6 text-xs text-ivory/55">Contenu illustratif de démonstration · <Link href={ "/recit/" + story.slug + "/" } className="underline underline-offset-4 hover:text-white">Relire le récit complet</Link></p>
          </>
        ) : (
          <div className="py-8 text-center">
            <h2 className="font-display text-3xl font-semibold">Toutes vos révisions sont à jour !</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ivory/75">Revenez plus tard pour retrouver vos cartes. Les intervalles s&apos;allongent quand vous retenez les idées.</p>
            <Link href="/" className="mt-6 inline-block rounded-full bg-mint px-6 py-3 text-sm font-semibold text-night">Retour au fil</Link>
          </div>
        )}
      </section>
      {due.length > 1 && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-night">Autres cartes disponibles</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {due.filter(s => s.slug !== story?.slug).map(s => (
              <button key={s.slug} type="button" onClick={() => { setSelected(s.slug); setRevealed(false); }}
                className="rounded-full border border-night/15 bg-paper px-4 py-2 text-left text-sm text-night hover:border-blue">{s.title}</button>
            ))}
          </div>
        </section>
      )}
      <div className="mt-10 rounded-2xl border border-night/10 p-5 text-sm text-muted">
        <p>La progression est enregistrée uniquement dans ce navigateur. Il ne s&apos;agit pas d&apos;un test de connaissances certifié.</p>
        {learned > 0 && <button type="button" onClick={() => { reset(); setSelected(null); setRevealed(false); }} className="mt-3 font-semibold text-blue underline underline-offset-4">Remettre ma progression à zéro</button>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-paper p-4 ring-1 ring-night/10">
      <p className="font-display text-3xl font-semibold text-night">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
