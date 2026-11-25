"use client";

import Link from "next/link";
import type { DossierSummary } from "@/lib/dossiers";
import { dossierPath } from "@/lib/dossiers";
import { formatDate } from "@/lib/format";
import { useFollows, withSimulated } from "@/lib/follows";

/**
 * Bibliothèque : « Dossiers suivis ». Pour chaque dossier, son titre et, s'il y a une
 * mise à jour pas encore consultée, sa date et ce qui a changé, avec un lien vers elle.
 */
export function FollowedDossiers({ dossiers }: { dossiers: DossierSummary[] }) {
  const { follows, unfollow } = useFollows();
  const ids = Object.keys(follows);
  const byId = new Map(dossiers.map((d) => [d.id, d]));

  return (
    <section aria-labelledby="dossiers-suivis" className="mt-8" data-testid="followed-dossiers">
      <h2 id="dossiers-suivis" className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">Dossiers suivis</h2>
      {ids.length === 0 ? (
        <p className="mt-3 text-sm text-muted" data-testid="followed-empty">
          Aucun dossier suivi. Sur un dossier, touchez « Suivre ce dossier » pour retrouver ici ce qui a changé.
        </p>
      ) : (
        <ul>
          {ids.map((id) => {
            const d = byId.get(id);
            if (!d) {
              return (
                <li key={id} className="border-b border-rule py-4 text-sm text-muted" data-testid="followed-missing">
                  Un dossier que vous suiviez a été retiré du site.{" "}
                  <button type="button" onClick={() => unfollow(id)} className="min-h-11 font-semibold text-accent underline underline-offset-4">Arrêter de le suivre</button>
                </li>
              );
            }
            const follow = follows[id];
            const fresh = withSimulated(d.updates, follow).filter((u) => !follow.seen.includes(u.id));
            const latest = fresh[0];
            return (
              <li key={id} className="border-b border-rule py-4" data-testid="followed-dossier" data-new={latest ? "true" : "false"}>
                <p className="text-[0.75rem] font-semibold text-accent">Dossier</p>
                <h3 className="mt-1 text-[1.05rem] leading-snug font-semibold text-ink text-balance">
                  <Link href={dossierPath(id)} className="title-link">{d.title}</Link>
                </h3>
                {latest ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-ink" data-testid="followed-update">
                    <span className="mr-2 rounded-xs bg-accent px-1.5 py-0.5 text-[0.7rem] font-semibold text-white">Nouveau</span>
                    <time dateTime={latest.date} className="font-semibold">{formatDate(latest.date)}</time> : {latest.text}{" "}
                    <Link href={`${dossierPath(id)}#maj-${latest.id}`} className="font-semibold text-accent underline underline-offset-4">Voir la mise à jour</Link>
                    {fresh.length > 1 && <span className="text-muted"> (et {fresh.length - 1} autre{fresh.length > 2 ? "s" : ""})</span>}
                  </p>
                ) : (
                  <p className="mt-1.5 text-meta text-muted">Rien de nouveau depuis votre dernière visite.</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
