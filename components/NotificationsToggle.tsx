"use client";

import { useEffect, useState } from "react";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push";

const HELP: Record<Exclude<PushState, "loading" | "on" | "off">, string> = {
  "ios-install": "Sur iPhone, ajoutez d'abord MUNDI à l'écran d'accueil (Partager, puis « Sur l'écran d'accueil »), puis ouvrez l'application pour activer les notifications.",
  unsupported: "Ce navigateur ne permet pas de recevoir des notifications.",
  unavailable: "Les notifications ne sont pas encore disponibles. Réessayez plus tard.",
  denied: "Les notifications sont bloquées pour MUNDI. Vous pouvez les autoriser dans les réglages de votre navigateur ou de votre téléphone.",
};

/** Interrupteur « Prévenez-moi à chaque édition » : rien n'est demandé sans un toucher. */
export function NotificationsToggle() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    pushState().then((s) => alive && setState(s)).catch(() => alive && setState("unsupported"));
    return () => { alive = false; };
  }, []);

  async function toggle() {
    setBusy(true);
    try { setState(state === "on" ? await disablePush() : await enablePush()); }
    catch { setState("unavailable"); }
    finally { setBusy(false); }
  }

  const ready = state === "on" || state === "off";
  return (
    <div className="mt-4" data-testid="notifications" data-state={state}>
      {ready ? (
        <button type="button" role="switch" aria-checked={state === "on"} disabled={busy} onClick={toggle}
          className="flex items-center gap-3 text-left text-sm font-semibold text-ink disabled:opacity-60">
          <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${state === "on" ? "bg-accent" : "bg-rule-strong"}`}>
            <span className={`absolute top-0.5 size-5 rounded-full bg-page shadow transition-transform ${state === "on" ? "translate-x-[1.375rem]" : "translate-x-0.5"}`} />
          </span>
          Prévenez-moi quand une édition sort
        </button>
      ) : state === "loading" ? (
        <p className="text-sm text-muted">Vérification…</p>
      ) : (
        <p className="max-w-2xl text-sm leading-relaxed text-muted" role="status">{HELP[state]}</p>
      )}
      {state === "on" && <p className="mt-2 text-sm text-muted" role="status">C&apos;est activé : une notification le matin et une l&apos;après-midi, au plus.</p>}
    </div>
  );
}
