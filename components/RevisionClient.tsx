"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRevision } from "@/lib/revision";
import { verificationLabel } from "@/lib/verification";
import { KIND_LABEL, publicationKind, type PublicationKind } from "@/lib/publication-kind";
import { getTopic } from "@/lib/topics";
import { publicationKey, publicationPath } from "@/lib/publication-links";
import type { FeedPublication } from "@/lib/verified";
import type { TopicSlug } from "@/lib/types";

type Card = {
  key: string; title: string; topic: TopicSlug; keyPoints: readonly string[];
  href: string; kind: PublicationKind; aiVerified?: boolean;
};
const KINDS: PublicationKind[] = ["actualite", "concept", "recit"];
const KIND_TABS: Record<PublicationKind, string> = { actualite: "Actualités", concept: "Concepts", recit: "Récits" };

export function RevisionClient({ publications }: { publications: FeedPublication[] }) {
  const { records, mark, reset } = useRevision();
  const [kind, setKind] = useState<PublicationKind>("actualite");
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [now] = useState(() => Date.now());

  const publicCards = useMemo<Card[]>(() => publications.map((p) => ({
    key: publicationKey(p.slug), title: p.title, topic: p.topic,
    keyPoints: p.keyPoints, href: publicationPath(p.slug),
    kind: publicationKind(p), aiVerified: p.aiVerified,
  })), [publications]);

  const cards = publicCards.filter((card) => card.kind === kind);
  const due = cards.filter((card) => !records[card.key] || records[card.key].level === 0 || new Date(records[card.key].nextAt).getTime() <= now);
  const mastered = cards.filter((card) => (records[card.key]?.level ?? 0) >= 3).length;
  const learned = cards.filter((card) => Boolean(records[card.key])).length;
  const story = due.find((card) => card.key === selected) ?? due[0] ?? null;

  function changeKind(next: PublicationKind) {
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
    <div className="mt-6">
      <div role="group" aria-label="Choisir les contenus à réviser" className="flex gap-5 overflow-x-auto border-b border-rule max-[359px]:gap-3">
        {KINDS.filter((k) => k !== "recit" || publicCards.some((c) => c.kind === "recit")).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => changeKind(k)}
            className={"-mb-px whitespace-nowrap border-b-2 pb-2 text-sm font-semibold transition-colors " +
              (kind === k ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink")}>
            {KIND_TABS[k]} <span className="font-mono">({publicCards.filter((c) => c.kind === k).length})</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">
        {kind === "actualite"
          ? "Révisez les trois idées essentielles des actualités sourcées de MUNDI. Le niveau de vérification est rappelé pour chaque carte."
          : kind === "concept"
            ? "Révisez les notions durables expliquées par les concepts de MUNDI, chacun sourcé."
            : "Révisez les histoires vraies, épisodes et idées racontés par MUNDI, chacun sourcé."}
      </p>
      <p className="mt-2 text-base text-ink" data-testid="revision-progress">
        <span className="font-mono">{due.length}</span> carte{due.length > 1 ? "s" : ""} à réviser,{" "}
        <span className="font-mono">{learned}</span> déjà étudiée{learned > 1 ? "s" : ""},{" "}
        <span className="font-mono">{mastered}</span> bien retenue{mastered > 1 ? "s" : ""}.
      </p>
      <section className="mt-8 rounded-md border border-rule-strong bg-surface p-6 md:p-9" aria-label="Carte de révision">
        {story ? (
          <>
            <p className="text-meta text-muted">
              <span className="font-semibold text-accent">{getTopic(story.topic)?.name}</span> · Carte mémoire · {KIND_LABEL[story.kind]}
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-titre font-semibold text-ink text-balance">{story.title}</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              Essayez de rappeler à voix haute les trois idées essentielles avant de révéler la réponse.
            </p>
            {revealed ? (
              <div className="mt-7">
                <h3 className="text-sm font-semibold text-ink">Les trois idées à retenir</h3>
                <ol className="mt-3 border-t border-rule">
                  {story.keyPoints.map((point, i) => (
                    <li key={i} className="flex gap-4 border-b border-rule py-3 text-base leading-relaxed text-ink">
                      <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-6 text-meta text-muted">Auto-évaluation : indiquez si vous avez retrouvé les idées principales.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" onClick={() => grade(false)} className="btn btn-secondary">À revoir</button>
                  <button type="button" onClick={() => grade(true)} className="btn btn-primary">J&apos;ai retenu</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setRevealed(true)} className="btn btn-primary mt-7">
                Révéler les 3 idées
              </button>
            )}
            <p className="mt-6 text-meta text-muted">
              {verificationLabel(story) + " · "}
              <Link href={story.href} className="underline underline-offset-4 hover:text-ink">
                Relire l&apos;article et ses sources
              </Link>
            </p>
          </>
        ) : (
          <div className="py-4">
            <h2 className="font-display text-2xl font-semibold text-ink">Toutes vos révisions sont à jour</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">Revenez plus tard pour retrouver vos cartes. Les intervalles s&apos;allongent quand vous retenez les idées.</p>
            <Link href="/" className="btn btn-secondary mt-5">Retour au fil</Link>
          </div>
        )}
      </section>
      {due.length > 1 && (
        <section className="mt-10">
          <h2 className="border-b border-ink pb-2 font-display text-xl font-semibold text-ink">Autres cartes disponibles</h2>
          <ul>
            {due.filter((card) => card.key !== story?.key).map((card) => (
              <li key={card.key} className="border-b border-rule">
                <button type="button" onClick={() => { setSelected(card.key); setRevealed(false); }}
                  className="w-full py-3 text-left font-display text-base leading-snug text-ink hover:text-accent">{card.title}</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-10 border-t border-rule pt-4 text-sm text-muted">
        <p>La progression est conservée uniquement dans ce navigateur, pour les actualités comme pour les concepts. Ce n&apos;est pas un test certifié.</p>
        {learned > 0 && <button type="button" onClick={() => { reset(); setSelected(null); setRevealed(false); }}
          className="mt-3 font-semibold text-accent underline underline-offset-4">Remettre toute ma progression à zéro</button>}
      </div>
    </div>
  );
}
