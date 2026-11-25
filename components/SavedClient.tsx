"use client";

import Link from "next/link";
import { useState } from "react";
import { useBookmarks } from "@/lib/bookmarks";
import { formatDate } from "@/lib/format";
import { formatOf } from "@/lib/home";
import { getTopic } from "@/lib/topics";
import type { FeedPublication } from "@/lib/verified";
import { publicationKey, publicationPath } from "@/lib/publication-links";
import { verificationLabel } from "@/lib/verification";

type Undo = { label: string; previous: string[] };

/**
 * Bibliothèque (refonte #113) : liste compacte des contenus enregistrés.
 * - Retrait individuel, avec « Annuler » ;
 * - « Tout effacer » demande une confirmation, puis propose aussi « Annuler » ;
 * - un contenu retiré du site est signalé au lieu de disparaître sans explication.
 */
export function SavedClient({ publications = [] }: { publications?: FeedPublication[] }) {
  const { saved, toggle, clear, restore } = useBookmarks();
  const [confirming, setConfirming] = useState(false);
  const [undo, setUndo] = useState<Undo | null>(null);
  const bySlug = new Map(publications.map((p) => [publicationKey(p.slug), p]));
  const savedPublications = saved.flatMap((key) => (bySlug.has(key) ? [bySlug.get(key)!] : []));
  const missing = saved.filter((key) => !bySlug.has(key));
  const total = savedPublications.length;

  function remove(p: FeedPublication) {
    setUndo({ label: `« ${p.title} » retiré de la bibliothèque.`, previous: saved });
    toggle(publicationKey(p.slug));
  }
  function clearAll() {
    setUndo({ label: "Bibliothèque vidée.", previous: saved });
    setConfirming(false);
    clear();
  }

  const undoBar = undo && (
    <div role="status" className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-l-2 border-accent py-1 pl-3 text-sm text-ink" data-testid="saved-undo">
      <span>{undo.label}</span>
      <button type="button" onClick={() => { restore(undo.previous); setUndo(null); }} className="min-h-11 font-semibold text-accent underline underline-offset-4">
        Annuler
      </button>
    </div>
  );

  if (total === 0 && missing.length === 0) {
    return (
      <div className="mt-8">
        {undoBar}
        <p className="mt-6 font-display text-xl font-semibold text-ink">Rien d&apos;enregistré pour l&apos;instant</p>
        <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">
          Touchez « Enregistrer » sur une publication pour la retrouver ici plus tard.
        </p>
        <Link href="/" className="btn btn-primary mt-5">Parcourir l&apos;accueil</Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {undoBar}
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-2">
        <p className="text-sm text-muted">
          <span className="font-mono">{total}</span> contenu{total > 1 ? "s" : ""} enregistré{total > 1 ? "s" : ""}
        </p>
        {confirming ? (
          <span className="flex flex-wrap items-center gap-3 text-sm" role="group" aria-label="Confirmer l'effacement">
            <span className="text-ink">Tout effacer ?</span>
            <button type="button" onClick={clearAll} className="min-h-11 font-semibold text-accent underline underline-offset-4" data-testid="saved-clear-confirm">
              Oui, tout effacer
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="min-h-11 font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
              Garder
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="min-h-11 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
            Tout effacer
          </button>
        )}
      </div>
      {missing.length > 0 && (
        <p className="mt-4 text-sm text-muted" data-testid="saved-missing">
          {missing.length} contenu{missing.length > 1 ? "s" : ""} enregistré{missing.length > 1 ? "s ont" : " a"} été retiré{missing.length > 1 ? "s" : ""} du site.{" "}
          <button type="button" onClick={() => restore(saved.filter((k) => bySlug.has(k)))} className="min-h-11 font-semibold text-accent underline underline-offset-4">
            Les enlever de la liste
          </button>
        </p>
      )}
      <ul className="grid lg:grid-cols-2 lg:gap-x-8">
        {savedPublications.map((p) => (
          <li key={p.slug} data-testid="saved-publication" className="group flex min-w-0 items-start gap-3 border-b border-rule py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[0.75rem] font-semibold text-accent">
                {formatOf(p)}
                <span className="font-normal text-muted"> · {getTopic(p.topic)?.name}</span>
              </p>
              <h3 className="mt-1 text-[1.05rem] leading-snug font-semibold text-ink text-balance">
                <Link href={publicationPath(p.slug)} className="title-link">{p.title}</Link>
              </h3>
              <p className="mt-1.5 text-meta text-muted">
                <time dateTime={p.publishedAt}>{formatDate(p.publishedAt)}</time> · {verificationLabel(p)} · {p.sources.length} sources
              </p>
            </div>
            <button type="button" onClick={() => remove(p)} aria-label={`Retirer de la bibliothèque : ${p.title}`} className="min-h-11 shrink-0 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline" data-testid="saved-remove">
              Retirer
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
