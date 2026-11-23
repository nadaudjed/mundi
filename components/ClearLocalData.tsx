"use client";

import { useState } from "react";
import { LOCAL_DATA } from "@/lib/local-data";

/** Efface, sur cet appareil seulement, tout ce que MUNDI y a gardé, puis recharge la page. */
export function ClearLocalData() {
  const [confirming, setConfirming] = useState(false);

  function clear() {
    try {
      for (const { key } of LOCAL_DATA) window.localStorage.removeItem(key);
    } catch {
      /* stockage indisponible : rien à effacer */
    }
    window.location.reload();
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="rounded-full border border-night/20 px-5 py-2.5 text-sm font-medium text-night hover:border-night/50">
        Effacer mes données MUNDI sur cet appareil
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Confirmer l'effacement">
      <p className="text-sm text-night">Vos enregistrements, sujets et révisions seront effacés de cet appareil.</p>
      <button type="button" onClick={clear} className="rounded-full bg-night px-5 py-2.5 text-sm font-medium text-ivory hover:bg-blue">
        Oui, tout effacer
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="rounded-full px-3 py-2.5 text-sm font-medium text-night underline underline-offset-4">
        Annuler
      </button>
    </div>
  );
}
