"use client";

import Link from "next/link";
import { promptInstall, useInstallState } from "@/lib/install";
import { Icon } from "./Icon";
import { useToast } from "./Toast";

/** Petit bouton « Installer » : ouvre la fenêtre du navigateur, sinon la page d'aide. */
export function InstallChip({ tone = "light" }: { tone?: "light" | "dark" }) {
  const state = useInstallState();
  const toast = useToast();
  if (state === "installed" || state === "unknown") return null;
  const cls =
    tone === "light"
      ? "border-ivory/30 text-ivory hover:border-ivory/70"
      : "border-night/15 text-night hover:border-night/40";
  const content = (
    <>
      <Icon name="download" className="size-3.5" />
      Installer
    </>
  );
  if (state === "available") {
    return (
      <button
        type="button"
        onClick={async () => {
          const r = await promptInstall();
          if (r === "accepted") toast("MUNDI est installé sur votre appareil");
        }}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold ${cls}`}
      >
        {content}
      </button>
    );
  }
  return (
    <Link href="/application/" className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold ${cls}`}>
      {content}
    </Link>
  );
}

/** Bloc détaillé de la page /application/ selon l'appareil. */
export function InstallPanel() {
  const state = useInstallState();
  const toast = useToast();

  if (state === "installed") {
    return (
      <p className="mt-8 rounded-3xl bg-mint/12 p-6 font-medium text-[#0f6e5b]" data-testid="install-state">
        MUNDI est déjà installé et ouvert comme une application.
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-4" data-testid="install-state" data-state={state}>
      {state === "available" && (
        <button
          type="button"
          onClick={async () => {
            const r = await promptInstall();
            toast(r === "accepted" ? "MUNDI est installé sur votre appareil" : "Installation annulée");
          }}
          className="inline-flex items-center gap-2 rounded-full bg-night px-6 py-3 text-sm font-semibold text-ivory hover:bg-blue"
        >
          <Icon name="download" className="size-4" />
          Installer MUNDI
        </button>
      )}
      <Steps
        title="Sur iPhone ou iPad (Safari)"
        highlight={state === "ios"}
        steps={["Touchez le bouton Partager (carré avec une flèche).", "Choisissez « Sur l'écran d'accueil ».", "Touchez « Ajouter »."]}
      />
      <Steps
        title="Sur Android (Chrome) ou ordinateur (Chrome, Edge)"
        highlight={state === "manual" || state === "available"}
        steps={[
          "Ouvrez le menu du navigateur (⋮).",
          "Choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil ».",
          "Confirmez.",
        ]}
      />
    </div>
  );
}

function Steps({ title, steps, highlight }: { title: string; steps: string[]; highlight: boolean }) {
  return (
    <section className={`rounded-3xl p-6 ring-1 ${highlight ? "bg-paper ring-blue/40" : "bg-paper/60 ring-night/8"}`}>
      <h2 className="font-semibold text-night">
        {title}
        {highlight && <span className="ml-2 rounded-full bg-blue/10 px-2 py-0.5 text-xs font-semibold text-blue-ink">Votre appareil</span>}
      </h2>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[0.95rem] text-night/85">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </section>
  );
}
