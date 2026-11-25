import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { formatDate } from "@/lib/format";
import { publicationPath } from "@/lib/publication-links";
import { missingFromSelection, selectToday } from "@/lib/today";
import { getTopic } from "@/lib/topics";
import { verificationLabel } from "@/lib/verification";
import { feedPublications, todayConfig } from "@/lib/verified";

export const metadata: Metadata = { title: "Atelier · édition Aujourd'hui", robots: { index: false, follow: false } };

/** Rubriques qui remontent toujours en relecture (même sans mention explicite), cf. ticket 41. */
const SENSITIVE_TOPICS = new Set(["geopolitique", "finance"]);

/**
 * Contrôle éditorial de l'édition « Aujourd'hui » : ce que les lecteurs verront, le statut de
 * vérification de chaque sujet, les points à relire, et les sujets sensibles remontés en tête.
 * Lecture seule : la sélection se modifie dans content/aujourdhui.json (par une PR).
 */
export default function TodayStudioPage() {
  const config = todayConfig;
  const picks = config ? selectToday(feedPublications, config) : [];
  const missing = config ? missingFromSelection(feedPublications.map((p) => p.slug), config) : [];
  const rows = picks.map((pick, rank) => {
    const p = pick.publication;
    const d = p.decryptage;
    const sensitive = d?.sensitive ?? (SENSITIVE_TOPICS.has(p.topic) ? `Rubrique ${getTopic(p.topic)?.name}` : undefined);
    const toReview = [
      ...(d?.verification.toReview ?? []),
      ...(!d ? ["Aucun décryptage : la carte reprend le résumé de l'article."] : []),
      ...(p.aiVerified ? ["Article vérifié par l'IA seule : relecture humaine conseillée avant la diffusion."] : []),
      ...(!p.audio ? ["Pas de version audio enregistrée : la voix du téléphone servira de secours."] : []),
    ];
    return { pick, rank, p, d, sensitive, toReview };
  });
  // Les sujets sensibles remontent en tête de la liste de relecture.
  const review = [...rows].sort((a, b) => Number(!!b.sensitive) - Number(!!a.sensitive) || a.rank - b.rank);

  return (
    <div className="mx-auto max-w-4xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20" data-testid="today-studio">
      <PageIntro title="Édition « Aujourd'hui »">
        Contrôle de la sélection du jour avant diffusion. Rien n&apos;est publié depuis cette page : la sélection se change dans <code>content/aujourdhui.json</code>, par une PR.
      </PageIntro>
      {!config ? (
        <p className="mt-8 text-muted">Aucune édition configurée sur ce site.</p>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted">
            Édition du {formatDate(config.edition)} · {config.selectedBy ?? "sélection de la rédaction"} · {picks.length} sujet{picks.length > 1 ? "s" : ""} affiché{picks.length > 1 ? "s" : ""}
          </p>
          {missing.length > 0 && (
            <p className="mt-4 border-l-2 border-amber pl-4 text-sm text-ink" data-testid="today-missing">
              {missing.length} sujet{missing.length > 1 ? "s" : ""} choisi{missing.length > 1 ? "s" : ""} introuvable{missing.length > 1 ? "s" : ""} (retiré ou mal orthographié) : {missing.join(", ")}. La sélection de secours complète avec les publications récentes.
            </p>
          )}
          <h2 className="mt-10 font-display text-intertitre font-semibold text-ink">À relire</h2>
          <ol className="mt-4 space-y-4">
            {review.map(({ pick, rank, p, d, sensitive, toReview }) => (
              <li key={p.slug} className={`border p-4 ${sensitive ? "border-accent" : "border-rule"}`} data-testid="today-review-item" data-sensitive={sensitive ? "true" : "false"}>
                <p className="text-meta text-muted">
                  Position {rank + 1} · {getTopic(p.topic)?.name} · {pick.reason === "secours" ? "sélection de secours" : "choisi par la rédaction"}
                </p>
                <p className="mt-1 font-semibold text-ink">
                  <Link href={publicationPath(p.slug)} className="underline underline-offset-2">{d?.shortTitle ?? p.title}</Link>
                </p>
                <p className="mt-1 text-sm">
                  <span className="font-semibold">{verificationLabel(p)}</span>
                  {d && <> · décryptage : {d.verification.status === "humain" ? "article relu par une personne" : "IA seule"}, {d.verification.writtenBy}</>}
                </p>
                {sensitive && <p className="mt-1 text-sm font-semibold text-accent">Sujet sensible : {sensitive}</p>}
                {toReview.length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink/85">
                    {toReview.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
