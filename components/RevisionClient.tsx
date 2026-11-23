"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRevision } from "@/lib/revision";
import { stories } from "@/lib/stories";
import { getTopic } from "@/lib/topics";
import { publicationKey, publicationPath } from "@/lib/publication-links";
import type { FeedPublication } from "@/lib/verified";
import type { TopicSlug } from "@/lib/types";

type Kind = "publications" | "demos";
type Card = {
  key: string; title: string; topic: TopicSlug; keyPoints: readonly string[];
  href: string; isDemo: boolean; aiVerified?: boolean;
};

const demoCards: Card[] = stories.map((s) => ({
  key: s.slug, title: s.title, topic: s.topic,
  keyPoints: s.keyPoints, href: "/recit/" + s.slug + "/", isDemo: true,
}));

export function RevisionClient({ publications }: { publications: FeedPublication[] }) {
  const { records, mark, reset } = useRevision();
  const [kind, setKind] = useState<Kind>(publications.length ? "publications" : "demos");
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [now] = useState(() => Date.now());

  const publicCards = useMemo<Card[]>(() => publications.map((p) => ({
    key: publicationKey(p.slug), title: p.title, topic: p.topic,
    keyPoints: p.keyPoints, href: publicationPath(p.slug),
    isDemo: false, aiVerified: p.aiVerified,
  })), [publications]);

  const cards = kind === "publications" ? publicCards : demoCards;
  const due = cards.filter((card) => !records[card.key] || records[card.key].level === 0 || new Date(records[card.key].nextAt).getTime() <= now);
  const mastered = cards.filter((card) => (records[card.key]?.level ?? 0) >= 3).length;
  const learned = cards.filter((card) => Boolean(records[card.key])).length;
  const story = due.find((card) => card.key === selected) ?? due[0] ?? null;

  function changeKind(next: Kind) {
    setKind(next);
    setSelected(null);
    setRevealed(false);
  }
  function grade(remembered: boolean) {
    if (!story) return;
    mark(story.key, remembered);
    setSelected(null);
    setRevealed(false);
  }

  return (
    <div className="mt-8">
      <div role="group" aria-label="Choisir les contenus à réviser"
        className="grid max-w-full grid-cols-2 gap-1 rounded-2xl sm:inline-grid border border-night/10 bg-paper p-1 shadow-sm">
        <button type="button" aria-pressed={kind === "publications"} onClick={() => changeKind("publications")}
          className={"whitespace-nowrap rounded-xl px-2 py-2.5 text-sm font-semibold transition max-[359px]:text-[0.8rem] sm:px-4 " +
            (kind === "publications" ? "bg-night text-ivory shadow-sm" : "text-night/75 hover:bg-night/5")}>
          Publications ({publicCards.length})
        </button>
        <button type="button" aria-pressed={kind === "demos"} onClick={() => changeKind("demos")}
          className={"whitespace-nowrap rounded-xl px-2 py-2.5 text-sm font-semibold transition max-[359px]:text-[0.8rem] sm:px-4 " +
            (kind === "demos" ? "bg-night text-ivory shadow-sm" : "text-night/75 hover:bg-night/5")}>
          Démonstrations ({demoCards.length})
        </button>
      </div>
      <p className="mt-3 text-sm text-muted">
        {kind === "publications"
          ? "Révisez trois idées essentielles des articles sourcés de MUNDI. Le niveau de vérification est rappelé pour chaque carte."
          : "Entraînement sur des récits pédagogiques fictifs, sans actualités ni données attestées."}
      </p>
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="À réviser" value={due.length} />
        <Stat label="Déjà étudiés" value={learned} />
        <Stat label="Bien retenus" value={mastered} />
      </div>
      <section className="relative mt-8 overflow-hidden rounded-[2rem] bg-night p-6 text-ivory shadow-[0_18px_55px_-25px_rgba(16,29,48,0.6)] md:p-9" aria-label="Carte de révision">
        {story && <div className="pointer-events-none absolute -right-20 -top-32 size-80 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: getTopic(story.topic)?.color }} aria-hidden="true" />}
        <div className="relative">
          {story ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-mint-soft">
                Carte mémoire · {getTopic(story.topic)?.name} · {story.isDemo ? "Démonstration" : "Publication sourcée"}
              </p>
              <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold leading-tight text-balance md:text-4xl">{story.title}</h2>
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
                  <p className="mt-6 text-xs text-ivory/60">Auto-évaluation : indiquez si vous avez retrouvé les idées principales.</p>
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
              <p className="mt-6 text-xs text-ivory/65">
                {story.isDemo ? "Exemple fictif · " : story.aiVerified ? "Contrôle IA, sans relecture humaine · " : "Validation humaine · "}
                <Link href={story.href} className="underline underline-offset-4 hover:text-white">
                  {story.isDemo ? "Relire le récit de démonstration" : "Relire l'article et ses sources"}
                </Link>
              </p>
            </>
          ) : (
            <div className="py-8 text-center">
              <h2 className="font-display text-3xl font-semibold">Toutes vos révisions sont à jour !</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ivory/75">Revenez plus tard pour retrouver vos cartes. Les intervalles s&apos;allongent quand vous retenez les idées.</p>
              <Link href="/" className="mt-6 inline-block rounded-full bg-mint px-6 py-3 text-sm font-semibold text-night">Retour au fil</Link>
            </div>
          )}
        </div>
      </section>
      {due.length > 1 && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-night">Autres cartes disponibles</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {due.filter((card) => card.key !== story?.key).map((card) => (
              <button key={card.key} type="button" onClick={() => { setSelected(card.key); setRevealed(false); }}
                className="rounded-full border border-night/15 bg-paper px-4 py-2 text-left text-sm text-night hover:border-blue-ink hover:bg-blue/5">{card.title}</button>
            ))}
          </div>
        </section>
      )}
      <div className="mt-10 rounded-2xl border border-night/10 p-5 text-sm text-muted">
        <p>La progression est conservée uniquement dans ce navigateur, pour les publications comme pour les démonstrations. Ce n&apos;est pas un test certifié.</p>
        {learned > 0 && <button type="button" onClick={() => { reset(); setSelected(null); setRevealed(false); }}
          className="mt-3 font-semibold text-blue-ink underline underline-offset-4">Remettre toute ma progression à zéro</button>}
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
