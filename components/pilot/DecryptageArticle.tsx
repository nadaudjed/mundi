import Link from "next/link";
import { Chart } from "@/components/Chart";
import { ListenButton } from "@/components/ListenButton";
import { MemoryCard } from "@/components/MemoryCard";
import { ReadingProgress } from "@/components/ReadingProgress";
import { RelatedPublications } from "@/components/RelatedPublications";
import { SaveButton, ShareButton } from "@/components/StoryActions";
import type { ComparisonCard } from "@/lib/data-cards";
import type { Decryptage } from "@/lib/decryptage";
import { formatDate } from "@/lib/format";
import { publicationKey, publicationPath } from "@/lib/publication-links";
import { getTopic } from "@/lib/topics";
import { frenchSpacing } from "@/lib/typo";
import { verificationLabel } from "@/lib/verification";
import type { FeedPublication, VerifiedPublication } from "@/lib/verified";
import { DecryptageVisual, VisualCredit } from "./DecryptageVisual";
import { QuizCard } from "./QuizCard";

const LABELS = { fait: "Fait", analyse: "Analyse", hypothese: "Hypothèse" };

/** Renvois numérotés vers la liste des sources, en bas de page. */
function SourceRefs({ refs, a }: { refs: number[]; a: VerifiedPublication }) {
  if (!refs.length) return null;
  return (
    <span className="ml-1 whitespace-nowrap text-[0.72rem] text-muted">
      {refs.map((i) => (
        <a key={i} href={`#source-${i + 1}`} className="ml-0.5 font-mono text-accent underline-offset-2 hover:underline" aria-label={`Source ${i + 1} : ${a.sources[i].label}`}>
          [{i + 1}]
        </a>
      ))}
    </span>
  );
}

/**
 * Page d'un sujet du pilote « Aujourd'hui », en trois niveaux :
 * 1. L'essentiel : le fait, sa conséquence, les chiffres avec leur source et leur périmètre ;
 * 2. Comprendre (2 à 3 minutes) : le visuel, trois questions, le lien vers un récit ou un concept,
 *    une question avec sa réponse expliquée, reliée à « Réviser » ;
 * 3. Approfondir : l'article complet, inchangé, et toutes ses sources.
 */
export function DecryptageArticle({ a, d, all }: { a: VerifiedPublication; d: Decryptage; all: FeedPublication[] }) {
  const topic = getTopic(a.topic);
  const comparison = a.dataCards?.find((c): c is ComparisonCard => c.kind === "comparaison" && c.presentation === "echelle-commune");
  const linked = d.link ? all.find((p) => p.slug === d.link!.slug) : undefined;
  const minutes = a.audioDuration ? `${Math.round(a.audioDuration)} s` : undefined;
  return (
    <article className="magazine mx-auto max-w-3xl px-5 pt-6 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-10 md:pb-20" data-testid="decryptage-article">
      <ReadingProgress />
      <nav aria-label="Retour" className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-muted">
        <Link href="/" className="hover:text-ink" data-testid="back-to-feed">← Retour au fil</Link>
        <Link href="/actualites/" className="hover:text-ink">Toutes les publications</Link>
      </nav>

      <header className="mt-8">
        <p className="text-meta font-semibold text-accent">
          {topic?.name} <span className="font-normal text-muted">· {d.format}</span>
        </p>
        <h1 className="font-serif mt-2 text-[clamp(2.3rem,1.6rem+3.4vw,3.9rem)] leading-[1.02] text-ink text-balance">{frenchSpacing(d.shortTitle)}</h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{frenchSpacing(a.title)}</p>
      </header>

      {/* Contrôle éditorial, dates du fait et de publication : visibles avant la lecture. */}
      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-y border-rule py-3 text-meta text-muted" data-testid="publication-meta">
        <dt className="font-semibold text-ink">Vérification</dt>
        <dd>
          <span className="font-semibold text-ink" data-testid="verification-label">{verificationLabel(a)}</span>
          {!a.aiVerified && <> ({a.reviewedBy})</>}
          {" · "}décryptage : {d.verification.writtenBy}
          {d.verification.status === "ia" && " ; relecture humaine à faire"}
        </dd>
        {d.eventDateLabel && (
          <>
            <dt className="font-semibold text-ink">Le fait</dt>
            <dd>{d.eventDate ? <time dateTime={d.eventDate}>{d.eventDateLabel}</time> : d.eventDateLabel}</dd>
          </>
        )}
        <dt className="font-semibold text-ink">Publication</dt>
        <dd>
          publié le <time dateTime={a.publishedAt}>{formatDate(a.publishedAt)}</time>
          {a.updatedAt !== a.publishedAt && <> · mis à jour le <time dateTime={a.updatedAt}>{formatDate(a.updatedAt)}</time></>}
          {" · "}<a href="#sources" className="underline underline-offset-2 hover:text-ink">{a.sources.length} sources</a>
        </dd>
      </dl>

      {a.corrections && a.corrections.length > 0 && (
        <aside className="mt-6 border-l-2 border-amber py-1 pl-4 text-sm text-ink" data-testid="corrections" aria-label="Corrections">
          <p className="font-semibold">Correction{a.corrections.length > 1 ? "s" : ""} apportée{a.corrections.length > 1 ? "s" : ""} à cet article</p>
          <ul className="mt-2 space-y-1">{a.corrections.map((c, i) => <li key={i}><time dateTime={c.date}>{formatDate(c.date)}</time> : {c.text}</li>)}</ul>
        </aside>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <ListenButton title={a.title} summary={a.summary} points={a.keyPoints} tone="light" audioSrc={a.audio} href={publicationPath(a.slug)} />
        {a.audio && minutes && <span className="text-meta text-muted">Version audio · {minutes}</span>}
        <SaveButton slug={publicationKey(a.slug)} title={a.title} />
        <ShareButton slug={a.slug} path={publicationPath(a.slug)} title={a.title} />
      </div>

      {/* 1. L'essentiel */}
      <section id="essentiel" aria-labelledby="essentiel-titre" className="mt-10 scroll-mt-20">
        <h2 id="essentiel-titre" className="text-meta font-semibold tracking-[0.14em] text-accent uppercase">1 · L&apos;essentiel</h2>
        <p className="font-serif mt-3 text-[1.6rem] leading-[1.2] text-ink md:text-[1.9rem]" data-testid="essentiel-fait">{d.essentiel.fait}</p>
        <p className="mt-3 text-[1.08rem] leading-relaxed text-ink/85" data-testid="essentiel-consequence">
          <span className="font-semibold text-ink">Conséquence : </span>{d.essentiel.consequence}
        </p>
        {d.figures.length > 0 && (
          <ul className="mt-6 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3" data-testid="figures">
            {d.figures.map((f) => (
              <li key={f.label} className="bg-page py-4 pr-4" data-testid="figure">
                <p className="font-serif text-[2.2rem] leading-none text-ink">{f.value}</p>
                <p className="mt-1 text-sm font-medium text-ink">{f.label}</p>
                <p className="mt-1 text-meta text-muted">
                  Périmètre : {f.scope} · Source :{" "}
                  <a href={`#source-${f.source + 1}`} className="underline underline-offset-2 hover:text-ink">{a.sources[f.source].label.split(/ [–—-] |, /)[0]}</a>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2. Comprendre */}
      <section id="comprendre" aria-labelledby="comprendre-titre" className="mt-14 scroll-mt-20">
        <h2 id="comprendre-titre" className="text-meta font-semibold tracking-[0.14em] text-accent uppercase">2 · Comprendre <span className="font-normal tracking-normal text-muted normal-case">· 2 à 3 minutes</span></h2>
        {d.visual && (
          <figure className="mt-5" data-testid="decryptage-figure">
            {d.visual.type !== "graphique" && <p className="font-serif mb-3 text-[1.45rem] leading-tight text-ink">{d.visual.title}</p>}
            <DecryptageVisual decryptage={d} photo={a.photo} word={topic?.name ?? "MUNDI"} variant="article" />
            <figcaption className="mt-2 text-meta leading-relaxed text-muted">
              {d.visual.caption} <VisualCredit visual={d.visual} photo={a.photo} />
            </figcaption>
          </figure>
        )}
        <div className="mt-8 space-y-8">
          {d.questions.map((q, i) => (
            <div key={q.question} data-testid="decryptage-question">
              <h3 className="font-serif text-[1.55rem] leading-tight text-ink">
                <span className="mr-2 font-mono text-[0.9rem] text-accent">{String(i + 1).padStart(2, "0")}</span>
                {q.question}
              </h3>
              {q.nature === "analyse" && <p className="mt-1 text-meta font-semibold text-muted">Analyse de MUNDI, pas un fait attribué à une source</p>}
              <p className="mt-2 text-[1.04rem] leading-[1.75] text-ink/90">
                {q.answer}
                <SourceRefs refs={q.sources} a={a} />
              </p>
            </div>
          ))}
        </div>
        {d.link && linked && (
          <Link href={publicationPath(linked.slug)} className="group mt-10 block border-l-2 border-accent bg-surface p-5 transition-colors hover:bg-ivory-2/40" data-testid="decryptage-link">
            <p className="text-meta font-semibold text-accent">{d.link.label}</p>
            <p className="mt-1 text-[0.98rem] leading-relaxed text-ink">{d.link.text}</p>
            <p className="mt-2 text-sm font-semibold text-ink underline decoration-rule-strong underline-offset-4 group-hover:decoration-accent">{linked.title}</p>
          </Link>
        )}
        <QuizCard quiz={d.quiz} />
      </section>

      {/* 3. Approfondir */}
      <section id="approfondir" aria-labelledby="approfondir-titre" className="mt-16 scroll-mt-20">
        <h2 id="approfondir-titre" className="text-meta font-semibold tracking-[0.14em] text-accent uppercase">3 · Approfondir</h2>
        <p className="mt-2 text-sm text-muted">L&apos;article complet, tel qu&apos;il a été publié.</p>
        <p className="mt-5 text-[1.04rem] leading-relaxed text-ink/90">{a.summary}</p>
        {a.sections.map((s, i) => (
          <div key={i} className="mt-10">
            <p className="text-meta font-semibold text-muted">{LABELS[s.kind]}</p>
            <h3 className="font-serif mt-1 text-[1.6rem] leading-tight text-ink">{s.heading}</h3>
            <p className="mt-3 whitespace-pre-line text-[1.04rem] leading-[1.8] text-ink/90">{s.text}</p>
            {comparison && i === a.sections.findIndex((x) => x.kind === "fait") && d.visual?.type !== "graphique" && (
              <div className="mt-8">
                <Chart title={comparison.headline} unit={comparison.items[0].unit} period={[...new Set(comparison.items.map((x) => x.period))].join(", ")} source={comparison.source}
                  points={comparison.items.map((m) => ({ label: m.label, value: m.value }))} decimals={comparison.items[0].decimals} note={comparison.note} />
              </div>
            )}
          </div>
        ))}
        <MemoryCard points={a.keyPoints} />
        <RelatedPublications publication={a} all={all} />
        <section id="sources" className="mt-14 scroll-mt-20" aria-labelledby="sources-titre">
          <h2 id="sources-titre" className="font-serif border-b border-ink pb-2 text-[1.7rem] text-ink">Sources</h2>
          <ol>{a.sources.map((s, i) => (
            <li key={s.url} id={`source-${i + 1}`} className="flex scroll-mt-20 gap-4 border-b border-rule py-3 text-sm" data-testid="source-item">
              <span className="font-mono text-accent">{String(i + 1).padStart(2, "0")}</span>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="group/source min-w-0">
                <span className="block font-medium text-ink underline decoration-rule-strong underline-offset-4 group-hover/source:decoration-accent">{s.label}</span>
                <span className="mt-0.5 block font-mono text-[0.78rem] break-all text-muted">{s.url}</span>
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            </li>
          ))}</ol>
        </section>
        <aside className="mt-10 border border-rule p-5 text-sm leading-relaxed text-muted" data-testid="editorial-control" aria-label="Contrôle éditorial">
          <p className="font-semibold text-ink">Contrôle éditorial</p>
          <p className="mt-1">
            Article : {verificationLabel(a)}. Décryptage : {d.verification.writtenBy}, le {formatDate(d.verification.checkedAt)}
            {d.verification.status === "ia" ? ", sans relecture humaine pour l'instant." : "."}
          </p>
          <p className="mt-1">Une erreur ? L&apos;article est corrigé à la même adresse, avec la date de mise à jour ; une correction qui change le sens est signalée en haut de page.</p>
        </aside>
      </section>
    </article>
  );
}
