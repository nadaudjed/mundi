"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRevision } from "@/lib/revision";
import { verificationLabel } from "@/lib/verification";
import { KIND_LABEL, type PublicationKind } from "@/lib/publication-kind";
import { getTopic } from "@/lib/topics";
import type { ReviewCard } from "@/lib/flashcards";

const TYPE_LABEL: Record<ReviewCard["type"], string> = { idees: "Trois idées", question: "Question", chiffre: "Chiffre clé" };
const KINDS: PublicationKind[] = ["actualite", "concept", "recit"];
const KIND_TABS: Record<PublicationKind, string> = { actualite: "Actualités", concept: "Concepts", recit: "Récits" };

export function RevisionClient({ cards: publicCards }: { cards: ReviewCard[] }) {
  const { records, mark, reset } = useRevision();
  const [kind, setKind] = useState<PublicationKind>("actualite");
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  // La révision commence sur action : une seule carte active à la fois.
  const [started, setStarted] = useState(false);
  const cardRef = useRef<HTMLHeadingElement>(null);
  const [now] = useState(() => Date.now());

  // Chaque publication donne ses cartes : trois idées, questions écrites par les agents, chiffres clés.

  const cards = publicCards.filter((card) => card.kind === kind);
  const due = cards.filter((card) => !records[card.key] || records[card.key].level === 0 || new Date(records[card.key].nextAt).getTime() <= now);
  const mastered = cards.filter((card) => (records[card.key]?.level ?? 0) >= 3).length;
  const learned = cards.filter((card) => Boolean(records[card.key])).length;
  const story = due.find((card) => card.key === selected) ?? due[0] ?? null;

  // Au clavier et au lecteur d'écran, le focus suit la carte active.
  useEffect(() => {
    if (started) cardRef.current?.focus();
  }, [started, story?.key]);

  function start(key: string | null = null) {
    setSelected(key);
    setRevealed(false);
    setStarted(true);
  }
  function changeKind(next: PublicationKind) {
    setKind(next);
    setStarted(false);
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
      <div className="rounded-md border border-rule-strong bg-surface p-5 md:p-6" data-testid="revision-start">
        <p className="text-base text-ink" data-testid="revision-progress">
          <span className="font-mono">{due.length}</span> carte{due.length > 1 ? "s" : ""} à réviser,{" "}
          <span className="font-mono">{learned}</span> déjà étudiée{learned > 1 ? "s" : ""},{" "}
          <span className="font-mono">{mastered}</span> bien retenue{mastered > 1 ? "s" : ""}.
        </p>
        {due.length > 0 ? (
          started ? (
            <button type="button" onClick={() => { setStarted(false); setRevealed(false); setSelected(null); }} className="btn btn-secondary mt-4">
              Faire une pause
            </button>
          ) : (
            <button type="button" onClick={() => start()} className="btn btn-primary mt-4">
              {learned > 0 ? "Reprendre la révision" : "Commencer la révision"}
            </button>
          )
        ) : (
          <p className="mt-2 text-sm text-muted">Rien à réviser dans cet onglet pour l&apos;instant.</p>
        )}
      </div>
      <div role="group" aria-label="Choisir les contenus à réviser" className="mt-6 flex gap-5 overflow-x-auto border-b border-rule max-[359px]:gap-3">
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
      {(started || !story) && <section className="mt-8 rounded-md border border-rule-strong bg-surface p-6 md:p-9" aria-label="Carte de révision">
        {story ? (
          <>
            <p className="text-meta text-muted" data-testid="revision-card-type" data-type={story.type}>
              <span className="font-semibold text-accent">{getTopic(story.topic)?.name}</span> · {KIND_LABEL[story.kind]} · {TYPE_LABEL[story.type]}
            </p>
            <h2 ref={cardRef} tabIndex={-1} className="mt-3 max-w-2xl font-display text-titre font-semibold text-ink text-balance outline-none">{story.question}</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              {story.type === "idees" ? "Essayez de rappeler à voix haute les trois idées essentielles avant de révéler la réponse." : "Cherchez la réponse de tête avant de la révéler."}
            </p>
            {revealed ? (
              <div className="motion-rise mt-7" data-testid="revision-answer">
                {typeof story.answer === "string" ? (
                  <p className={story.type === "chiffre" ? "font-display text-4xl font-semibold text-accent" : "max-w-2xl border-l-2 border-accent pl-4 text-lg leading-relaxed text-ink"}>{story.answer}</p>
                ) : (
                  <>
                    <h3 className="text-sm font-semibold text-ink">Les trois idées à retenir</h3>
                    <ol className="mt-3 border-t border-rule">
                      {story.answer.map((point, i) => (
                        <li key={i} className="flex gap-4 border-b border-rule py-3 text-base leading-relaxed text-ink">
                          <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                {story.detail && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{story.detail}</p>}
                {/* Le titre peut contenir la réponse : il n'apparaît qu'une fois la carte retournée. */}
                {story.question !== story.title && <p className="mt-2 max-w-2xl text-sm text-muted">D&apos;après : {story.title}</p>}
                <p className="mt-6 text-meta text-muted">Auto-évaluation : indiquez si vous aviez la bonne réponse.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" onClick={() => grade(false)} className="btn btn-secondary">À revoir</button>
                  <button type="button" onClick={() => grade(true)} className="btn btn-primary">J&apos;ai retenu</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setRevealed(true)} className="btn btn-primary mt-7">
                {story.type === "idees" ? "Révéler les 3 idées" : "Révéler la réponse"}
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
            <Link href="/" className="btn btn-secondary mt-5">Retour à l&apos;accueil</Link>
          </div>
        )}
      </section>}
      {due.length > (started ? 1 : 0) && (
        <section className="mt-10">
          <h2 className="border-b border-ink pb-2 font-display text-xl font-semibold text-ink">{started ? "Autres cartes disponibles" : "Cartes à réviser"}</h2>
          <ul>
            {due.filter((card) => !started || card.key !== story?.key).map((card) => (
              <li key={card.key} className="border-b border-rule">
                <button type="button" onClick={() => start(card.key)}
                  className="w-full py-3 text-left font-display text-base leading-snug text-ink hover:text-accent">
                  <span className="mr-2 font-sans text-meta font-semibold text-muted">{TYPE_LABEL[card.type]}</span>{card.question === card.title ? card.title : card.question}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-10 border-t border-rule pt-4 text-sm text-muted">
        <p>La progression est conservée uniquement dans ce navigateur, pour les actualités comme pour les concepts. Ce n&apos;est pas un test certifié.</p>
        {learned > 0 && <button type="button" onClick={() => { reset(); setStarted(false); setSelected(null); setRevealed(false); }}
          className="mt-3 font-semibold text-accent underline underline-offset-4">Remettre toute ma progression à zéro</button>}
      </div>
    </div>
  );
}
