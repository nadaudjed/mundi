"use client";

import { useFollows } from "@/lib/follows";

/** « Suivre ce dossier » : action textuelle, état clair, arrêt possible. Stocké sur l'appareil. */
export function FollowButton({ id, title, updateIds }: { id: string; title: string; updateIds: string[] }) {
  const { follows, storageFailed, follow, unfollow } = useFollows();
  const followed = Boolean(follows[id]);
  return (
    <div className="mt-6" data-testid="dossier-follow" data-state={followed ? "on" : "off"}>
      <button
        type="button"
        aria-pressed={followed}
        onClick={() => (followed ? unfollow(id) : follow(id, updateIds))}
        className={followed ? "btn btn-secondary" : "btn btn-primary"}
      >
        {followed ? "Arrêter de suivre ce dossier" : "Suivre ce dossier"}
      </button>
      <p className="mt-2 text-sm text-muted" role="status">
        {storageFailed
          ? "Le suivi n'a pas pu être gardé sur cet appareil (stockage indisponible ou bloqué). Il sera oublié en fermant la page."
          : followed
            ? <>Vous suivez « {title} ». Ses mises à jour apparaîtront dans Bibliothèque, sans compte ni notification.</>
            : "Suivez ce dossier pour retrouver ses mises à jour dans Bibliothèque. Rien n'est envoyé : le choix reste sur cet appareil."}
      </p>
    </div>
  );
}
