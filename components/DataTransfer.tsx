"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { LEGACY_SITE_URL, SITE_URL } from "@/lib/site";
import {
  decodeLink, encodeLink, isEmpty, makePackage, mergeData, parsePackage, readLocal, summary, toStorage,
  type TransferData, type TransferPackage,
} from "@/lib/transfer";

const SENT_KEY = "mundi:transfert";

/** Ancienne adresse : l'hébergeur Netlify (production ou aperçu). */
function onLegacyHost() {
  return window.location.origin === LEGACY_SITE_URL || window.location.hostname.endsWith(".netlify.app");
}

function local(): TransferData {
  return readLocal((key) => window.localStorage.getItem(key));
}

function Summary({ data }: { data: TransferData }) {
  const s = summary(data);
  const rows = [
    [s.bookmarks, "article enregistré", "articles enregistrés"],
    [s.follows, "dossier suivi", "dossiers suivis"],
    [s.topics, "sujet choisi dans « Mes sujets »", "sujets choisis dans « Mes sujets »"],
    [s.revision, "carte de « Réviser » avec sa progression", "cartes de « Réviser » avec leur progression"],
  ] as const;
  return (
    <ul className="mt-3 space-y-1 text-[0.95rem] text-ink" data-testid="transfer-summary">
      {rows.map(([n, one, many]) => (
        <li key={one}><span className="font-semibold tabular-nums">{n}</span> {n > 1 ? many : one}</li>
      ))}
      <li>Thème : {s.theme === "dark" ? "sombre" : s.theme === "light" ? "clair" : "réglage de l'appareil"}</li>
    </ul>
  );
}

function download(data: TransferData) {
  const pkg = makePackage(data, window.location.origin);
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mundi-donnees-${pkg.exportedAt.slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Page /transfert/ : envoyer ses données depuis l'ancienne adresse, les recevoir sur la nouvelle. */
export function DataTransfer() {
  const [mode, setMode] = useState<"loading" | "legacy" | "official">("loading");
  const [mine, setMine] = useState<TransferData>({});
  const [pending, setPending] = useState<TransferPackage | null>(null);
  const [status, setStatus] = useState<"idle" | "done" | "invalid" | "failed">("idle");

  useEffect(() => {
    // Lecture du stockage local et du lien d'import : seulement dans le navigateur, après l'affichage.
    /* eslint-disable react-hooks/set-state-in-effect */
    const legacy = onLegacyHost();
    setMode(legacy ? "legacy" : "official");
    try { setMine(local()); } catch { setMine({}); }
    const hash = window.location.hash;
    if (!legacy && hash.startsWith("#import=")) {
      const pkg = decodeLink(hash.slice("#import=".length));
      if (pkg) setPending(pkg); else setStatus("invalid");
      // Les données ne restent pas dans l'adresse affichée ni dans l'historique.
      window.history.replaceState(null, "", window.location.pathname);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function sendToOfficial() {
    const pkg = makePackage(mine, window.location.origin);
    // Repère : l'accueil de l'ancienne adresse mène désormais directement à la nouvelle.
    try { window.localStorage.setItem(SENT_KEY, new Date().toISOString()); } catch { /* stockage bloqué */ }
    // Autre origine (adresse officielle) : une navigation complète est voulue, pas le routeur Next.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `${SITE_URL}/transfert/#import=${encodeLink(pkg)}`;
  }

  function importPackage(pkg: TransferPackage) {
    try {
      const merged = mergeData(local(), pkg.data);
      for (const [key, value] of toStorage(merged)) window.localStorage.setItem(key, value);
      setMine(merged);
      setPending(null);
      setStatus("done");
    } catch {
      setStatus("failed");
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const pkg = file.size < 2_000_000 ? parsePackage(await file.text()) : null;
    if (pkg) { setPending(pkg); setStatus("idle"); } else setStatus("invalid");
  }

  if (mode === "loading") return <p className="mt-8 text-sm text-muted">Lecture des données de ce navigateur…</p>;

  if (mode === "legacy") {
    const empty = isEmpty(mine);
    return (
      <div className="mt-8 space-y-8" data-testid="transfer" data-mode="legacy">
        <section className="rounded-2xl bg-surface p-5 ring-1 ring-rule">
          <h2 className="font-display text-xl font-semibold text-ink">Ce que ce navigateur garde pour l&apos;ancienne adresse</h2>
          {empty ? (
            <p className="mt-3 text-[0.95rem] text-ink/85">Rien à emporter : aucun favori, dossier suivi, sujet ni révision n&apos;est enregistré ici. Si vous lisiez MUNDI sur un autre appareil ou un autre navigateur, ouvrez cette page depuis celui-ci.</p>
          ) : <Summary data={mine} />}
        </section>
        {!empty && (
          <section className="space-y-3">
            <button type="button" onClick={sendToOfficial} className="btn btn-primary" data-testid="transfer-send">Emporter mes données vers la nouvelle adresse</button>
            <p className="max-w-2xl text-sm leading-relaxed text-muted">
              Vous arrivez sur {SITE_URL.replace("https://", "")}, qui vous demande de confirmer l&apos;import. Les données voyagent dans le lien, dans la
              partie qui n&apos;est jamais envoyée aux serveurs. Celles de l&apos;ancienne adresse restent en place.
            </p>
            <button type="button" onClick={() => download(mine)} className="btn btn-secondary">Télécharger un fichier de sauvegarde</button>
            <p className="max-w-2xl text-sm leading-relaxed text-muted">Pour passer sur un autre appareil : importez ce fichier sur la page Transfert de la nouvelle adresse.</p>
          </section>
        )}
        <p className="text-sm"><a href={`${SITE_URL}/`} className="font-medium text-ink underline underline-offset-4">Aller sur la nouvelle adresse de MUNDI</a></p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8" data-testid="transfer" data-mode="official">
      {status === "done" && (
        <p role="status" className="rounded-2xl bg-surface p-5 text-[0.95rem] text-ink ring-1 ring-rule" data-testid="transfer-done">
          C&apos;est fait : vos données sont dans ce navigateur, ajoutées à celles qui s&apos;y trouvaient déjà. Importer une deuxième fois ne crée pas de doublon.{" "}
          <a href="/enregistres/" className="font-semibold underline underline-offset-4">Ouvrir la Bibliothèque</a>
        </p>
      )}
      {status === "invalid" && <p role="alert" className="text-[0.95rem] text-ink">Ce lien ou ce fichier n&apos;est pas une sauvegarde MUNDI lisible. Recommencez depuis l&apos;ancienne adresse.</p>}
      {status === "failed" && <p role="alert" className="text-[0.95rem] text-ink">L&apos;enregistrement a échoué : ce navigateur bloque le stockage (navigation privée ?). Réessayez dans une fenêtre normale.</p>}
      {pending && (
        <section className="rounded-2xl bg-surface p-5 ring-1 ring-rule" data-testid="transfer-pending">
          <h2 className="font-display text-xl font-semibold text-ink">Données reçues{pending.from ? ` de ${pending.from.replace("https://", "")}` : ""}</h2>
          <Summary data={pending.data} />
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => importPackage(pending)} className="btn btn-primary" data-testid="transfer-import">Importer dans ce navigateur</button>
            <button type="button" onClick={() => setPending(null)} className="px-3 py-2.5 text-sm font-medium text-ink underline underline-offset-4">Annuler</button>
          </div>
        </section>
      )}
      <section>
        <h2 className="font-display text-xl font-semibold text-ink">Vos favoris sont restés sur l&apos;ancienne adresse ?</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[0.95rem] leading-relaxed text-ink/85">
          <li>Sur l&apos;appareil et dans le navigateur où vous lisiez MUNDI, ouvrez{" "}
            <a href={`${LEGACY_SITE_URL}/transfert/`} className="font-medium text-ink underline underline-offset-4">{LEGACY_SITE_URL.replace("https://", "")}/transfert/</a>.
            Les données sont rangées par le navigateur avec l&apos;adresse : le transfert doit partir de là.</li>
          <li>Touchez « Emporter mes données vers la nouvelle adresse ».</li>
          <li>De retour ici, vérifiez la liste puis touchez « Importer dans ce navigateur ».</li>
        </ol>
        <p className="mt-3 max-w-2xl text-sm text-muted">Sur iPhone, une application installée sur l&apos;écran d&apos;accueil garde ses propres données : ouvrez l&apos;ancienne icône MUNDI, elle mène à cette étape. Ensuite, ajoutez la nouvelle adresse à l&apos;écran d&apos;accueil.</p>
      </section>
      <section>
        <h2 className="font-display text-xl font-semibold text-ink">Avec un fichier de sauvegarde</h2>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 btn btn-secondary">
          Choisir un fichier
          <input type="file" accept="application/json,.json" onChange={onFile} className="sr-only" data-testid="transfer-file" />
        </label>
        {!isEmpty(mine) && (
          <p className="mt-4 text-sm">
            <button type="button" onClick={() => download(mine)} className="font-medium text-ink underline underline-offset-4">Télécharger une sauvegarde des données de ce navigateur</button>
          </p>
        )}
      </section>
    </div>
  );
}
