"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { DossierUpdate } from "@/lib/dossiers";
import { formatDate } from "@/lib/format";
import { useFollows, withSimulated } from "@/lib/follows";

const KIND = { fait: "Fait nouveau", correction: "Correction" } as const;

/**
 * « Ce qui a changé » : événements datés et sourcés, les plus récents d'abord.
 * Pour un dossier suivi, une mise à jour pas encore consultée porte « Nouveau » ;
 * elle compte comme consultée dès que cette section est affichée à l'écran.
 */
export function DossierChanges({ id, updates, previewTools = false }: { id: string; updates: DossierUpdate[]; previewTools?: boolean }) {
  const { follows, markSeen, simulate } = useFollows();
  const follow = follows[id];
  const all = withSimulated(updates, follow);
  // Une mise à jour simulée pendant cette visite reste « nouvelle » : on veut la voir arriver dans Bibliothèque.
  const [simulatedHere, setSimulatedHere] = useState<string[]>([]);
  const unseen = follow ? all.filter((u) => !follow.seen.includes(u.id) && !simulatedHere.includes(u.id)).map((u) => u.id) : [];
  // Les badges restent visibles pendant la visite, même après le marquage comme vu.
  const [shownNew, setShownNew] = useState<string[]>([]);
  const ref = useRef<HTMLElement>(null);
  const unseenKey = unseen.join(",");

  useEffect(() => {
    if (!unseenKey) return;
    const ids = unseenKey.split(",");
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setShownNew((prev) => [...new Set([...prev, ...ids])]);
        markSeen(id, ids);
        observer.disconnect();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [id, unseenKey, markSeen]);

  const isNew = (u: DossierUpdate) => unseen.includes(u.id) || shownNew.includes(u.id);

  return (
    <section id="ce-qui-a-change" ref={ref} aria-labelledby="ce-qui-a-change-titre" className="mt-14 scroll-mt-20" data-testid="dossier-changes">
      <h2 id="ce-qui-a-change-titre" className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">Ce qui a changé</h2>
      {all.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Aucune mise à jour depuis la création du dossier.</p>
      ) : (
        <ol>
          {all.map((u) => (
            <li key={u.id} id={`maj-${u.id}`} className="border-b border-rule py-4" data-testid="dossier-update" data-kind={u.kind} data-new={isNew(u) ? "true" : "false"}>
              <p className="text-meta text-muted">
                <time dateTime={u.date}>{formatDate(u.date)}</time> ·{" "}
                <span className={u.kind === "correction" ? "font-semibold text-ink" : "font-semibold text-accent"}>{KIND[u.kind]}</span>
                {isNew(u) && <span className="ml-2 rounded-xs bg-accent px-1.5 py-0.5 text-[0.7rem] font-semibold text-white">Nouveau</span>}
              </p>
              <p className="mt-1 text-base leading-relaxed text-ink">{u.text}</p>
              {(u.href || u.source) && (
                <p className="mt-1 text-sm text-muted">
                  {u.href && <Link href={u.href} className="underline underline-offset-4 hover:text-ink">Lire l&apos;article</Link>}
                  {u.href && u.source && " · "}
                  {u.source && <a href={u.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-ink">Source : {u.source.label}<span className="sr-only"> (nouvel onglet)</span></a>}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
      {previewTools && follow && (
        <p className="mt-4 rounded-sm border border-dashed border-rule-strong p-3 text-sm text-muted" data-testid="dossier-simulate-box">
          Outil de test, visible sur la preview seulement.{" "}
          <button type="button" onClick={() => { const created = simulate(id); if (created) setSimulatedHere((prev) => [...prev, created]); }} className="font-semibold text-accent underline underline-offset-4">Simuler une nouvelle mise à jour</button>
          , puis ouvrez Bibliothèque pour voir comment elle s&apos;annonce.
        </p>
      )}
    </section>
  );
}
