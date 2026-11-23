"use client";

import { useId, useState, type ChangeEvent } from "react";
import { MAX_DATA_CARDS_BYTES, parseDataCards, type DataCard } from "@/lib/data-cards";
import { getTopic } from "@/lib/topics";
import type { TopicSlug } from "@/lib/types";
import { DataCardView } from "./DataCardView";

/**
 * Atelier : import d'une séquence de cartes de données (mundi-data-cards-v1)
 * et aperçu marqué « Brouillon — non publié ». Rien n'est envoyé à un serveur.
 */
export function DataCardsImport({ topic, cards, onChange }: { topic: TopicSlug; cards: DataCard[] | null; onChange: (cards: DataCard[] | null) => void }) {
  const id = useId();
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const color = getTopic(topic)?.color ?? "#20B99A";

  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_DATA_CARDS_BYTES) {
      setErrors(["Fichier trop volumineux : 40 Ko maximum pour une séquence de cartes."]);
      return;
    }
    const result = parseDataCards(await file.text());
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    setFileName(file.name);
    onChange(result.cards);
  }

  return (
    <section aria-labelledby={`${id}-h`} className="mt-8 rounded-3xl bg-paper p-5 ring-1 ring-night/10 md:p-8" data-testid="data-cards-studio">
      <h2 id={`${id}-h`} className="font-display text-xl font-semibold text-night">3. Cartes de données (facultatif)</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Fichier « mundi-data-cards-v1 » préparé avec des chiffres sourcés. L&apos;atelier vérifie la structure (unités, périmètre, période,
        dénominateur, source) mais pas l&apos;exactitude des chiffres : une personne doit les valider.
      </p>
      <label htmlFor={id} className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-night/20 bg-white px-5 py-2.5 text-sm font-semibold text-night hover:border-night/50 focus-within:ring-2 focus-within:ring-mint">
        Choisir des cartes (.json)
        <input id={id} type="file" accept="application/json,.json" onChange={importFile} className="sr-only" data-testid="data-cards-file" />
      </label>
      {errors.length > 0 && (
        <div role="alert" className="mt-4 rounded-xl border border-[#b3261e]/40 bg-[#fdecea] p-4 text-sm text-[#7a1712]" data-testid="data-cards-errors">
          <p className="font-semibold">Ces cartes n&apos;ont pas été importées :</p>
          <ul className="mt-1 list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      {cards && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-night">
            <p className="font-semibold text-[#5c4210]">
              {cards.length} cartes importées ({fileName}) : brouillon non vérifié, ajouté au fichier téléchargé.
            </p>
            <button type="button" onClick={() => { onChange(null); setFileName(""); }} className="text-xs font-semibold text-muted underline">
              Retirer les cartes
            </button>
          </div>
          <ul className="mt-6 grid gap-6 md:grid-cols-2" aria-label="Aperçu des cartes de données" data-testid="data-cards-preview">
            {cards.map((card, i) => (
              <li key={card.id} className="mx-auto h-[38rem] w-full max-w-[24rem] overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-night/20">
                <DataCardView card={card} position={i} total={cards.length} topicColor={color} active={false} status="brouillon" showVisualPlaceholder />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
