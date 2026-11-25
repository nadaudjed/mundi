import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DossierChanges } from "@/components/dossier/DossierChanges";
import { FollowButton } from "@/components/dossier/FollowButton";
import { dossierPath, dossiers, getDossier, sortedUpdates, type Source } from "@/lib/dossiers";
import { formatDate } from "@/lib/format";
import { publicationPath } from "@/lib/publication-links";
import { shareDefaults } from "@/lib/site";
import { getTopic } from "@/lib/topics";
import { frenchSpacing } from "@/lib/typo";
import { verifiedPublications } from "@/lib/verified";

type Params = { slug: string };
export const dynamicParams = false;
export function generateStaticParams(): Params[] {
  return dossiers.map((d) => ({ slug: d.id }));
}
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const d = getDossier((await params).slug);
  if (!d) return {};
  return {
    title: d.shortTitle,
    description: d.intro,
    alternates: { canonical: dossierPath(d.id) },
    openGraph: { ...shareDefaults, type: "article", title: d.title, description: d.intro, url: dossierPath(d.id), modifiedTime: d.updatedAt },
  };
}

/** Outil « Simuler une mise à jour » : sur une preview Netlify (ou en test), jamais en production. */
const previewTools = process.env.CONTEXT === "deploy-preview" || process.env.MUNDI_PREVIEW_TOOLS === "1";

const TOC = [
  ["essentiel", "L'essentiel"],
  ["comprendre", "Comprendre"],
  ["approfondir", "Approfondir"],
  ["ce-qui-a-change", "Ce qui a changé"],
  ["corrections", "Corrections"],
  ["sources", "Sources"],
] as const;

export default async function DossierPage({ params }: { params: Promise<Params> }) {
  const d = getDossier((await params).slug);
  if (!d) notFound();
  const topic = getTopic(d.topic);
  const linked = d.publications.flatMap((link) => {
    const p = verifiedPublications.find((x) => x.slug === link.slug);
    return p ? [{ ...link, p }] : [];
  });
  // Un lien vers un article retiré (ou absent de ce site) est enlevé plutôt que de mener à une page vide.
  const published = new Set(verifiedPublications.map((p) => publicationPath(p.slug)));
  const updates = sortedUpdates(d.updates).map((u) => (u.href && !published.has(u.href) ? { ...u, href: undefined } : u));
  // Toutes les sources citées dans le dossier, sans doublon.
  const sources = [
    ...d.figures.map((f) => f.source),
    ...d.timeline.map((t) => t.source),
    ...updates.flatMap((u) => (u.source ? [u.source] : [])),
    ...linked.flatMap(({ p }) => p.sources as Source[]),
  ].filter((s, i, all) => all.findIndex((x) => x.url === s.url) === i);

  return (
    <article className="mx-auto max-w-3xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20" data-testid="dossier">
      <p className="text-meta font-semibold text-accent">Dossier{topic && <span className="font-normal text-muted"> · {topic.name}</span>}</p>
      <h1 className="mt-2 font-display text-une font-semibold text-ink text-balance">{frenchSpacing(d.title)}</h1>
      <p className="mt-5 text-lg leading-relaxed text-muted">{d.intro}</p>
      <p className="mt-6 border-y border-rule py-3 text-meta text-muted" data-testid="dossier-meta">
        <span className="font-semibold text-ink">{d.byline}</span> · créé le <time dateTime={d.createdAt}>{formatDate(d.createdAt)}</time> · mis à jour le{" "}
        <time dateTime={d.updatedAt}>{formatDate(d.updatedAt)}</time>
        <br />
        <span data-testid="dossier-verification">{d.verification}</span>
      </p>
      <FollowButton id={d.id} title={d.shortTitle} updateIds={updates.map((u) => u.id)} />

      <nav aria-label="Sommaire du dossier" className="mt-8 border-l-2 border-rule pl-4" data-testid="dossier-toc">
        <p className="text-meta font-semibold text-muted">Sommaire</p>
        <ol className="mt-2 space-y-1.5 text-sm">
          {TOC.map(([anchor, label]) => (
            <li key={anchor}><a href={`#${anchor}`} className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-accent">{label}</a></li>
          ))}
        </ol>
      </nav>

      <section id="essentiel" aria-labelledby="essentiel-titre" className="mt-12 scroll-mt-20">
        <h2 id="essentiel-titre" className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">L&apos;essentiel</h2>
        <ol className="mt-2">
          {d.essentiel.map((point, i) => (
            <li key={i} className="flex gap-4 border-b border-rule py-3 text-base leading-relaxed text-ink">
              <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span>{frenchSpacing(point)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="comprendre" aria-labelledby="comprendre-titre" className="mt-12 scroll-mt-20">
        <h2 id="comprendre-titre" className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">Comprendre</h2>
        <ul>
          {linked.map(({ role, p }) => (
            <li key={p.slug} className="border-b border-rule py-4" data-testid="dossier-publication">
              <p className="text-meta font-semibold text-accent">{role}</p>
              <h3 className="mt-1 text-lg leading-snug font-semibold text-ink text-balance">
                <Link href={publicationPath(p.slug)} className="title-link">{frenchSpacing(p.title)}</Link>
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="approfondir" aria-labelledby="approfondir-titre" className="mt-12 scroll-mt-20">
        <h2 id="approfondir-titre" className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">Approfondir</h2>
        <h3 className="mt-6 text-base font-semibold text-ink">Les chiffres</h3>
        <ul className="mt-2 grid gap-4 sm:grid-cols-3">
          {d.figures.map((f) => (
            <li key={f.value} className="border-t-2 border-accent pt-3" data-testid="dossier-figure">
              <p className="font-display text-3xl font-semibold text-ink">{f.value}</p>
              <p className="mt-1 text-sm leading-snug text-ink">{f.label}</p>
              <p className="mt-2 text-meta text-muted">
                {f.scope} · année : {f.year} ·{" "}
                <a href={f.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">Source : {f.source.label}<span className="sr-only"> (nouvel onglet)</span></a>
              </p>
            </li>
          ))}
        </ul>
        {d.map && (
          <figure className="mt-10" data-testid="dossier-map">
            <h3 className="text-base font-semibold text-ink">{d.map.title}</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.map.src} alt={d.map.alt} className="mt-3 w-full rounded-sm border border-rule bg-surface" loading="lazy" />
            <figcaption className="mt-2 text-meta leading-relaxed text-muted">{d.map.caption} {d.map.credit}</figcaption>
          </figure>
        )}
        <h3 className="mt-10 text-base font-semibold text-ink">Chronologie</h3>
        <ol className="mt-2 border-l-2 border-rule" data-testid="dossier-timeline">
          {d.timeline.map((t) => (
            <li key={t.date} className="relative py-3 pl-5">
              <span aria-hidden="true" className="absolute top-[1.15rem] -left-[0.35rem] size-2.5 rounded-full bg-accent" />
              <p className="text-meta font-semibold text-ink"><time dateTime={t.date}>{t.label}</time></p>
              <p className="mt-0.5 text-base leading-relaxed text-ink">{t.text}</p>
              <p className="mt-0.5 text-meta text-muted">
                <a href={t.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">Source : {t.source.label}<span className="sr-only"> (nouvel onglet)</span></a>
              </p>
            </li>
          ))}
        </ol>
        {/* Entretien original : affiché seulement une fois fourni et validé. */}
        {d.interview && d.interview.length > 0 && (
          <div className="mt-10" data-testid="dossier-interview">
            <h3 className="text-base font-semibold text-ink">Entretien</h3>
            <dl className="mt-2">
              {d.interview.map((qa, i) => (
                <div key={i} className="border-b border-rule py-3">
                  <dt className="font-semibold text-ink">{qa.question}</dt>
                  <dd className="mt-1 leading-relaxed text-ink">{qa.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>

      <DossierChanges id={d.id} updates={updates} previewTools={previewTools} />

      <section id="corrections" aria-labelledby="corrections-titre" className="mt-14 scroll-mt-20" data-testid="dossier-corrections">
        <h2 id="corrections-titre" className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">Corrections</h2>
        {d.corrections.length ? (
          <ul className="mt-2">{d.corrections.map((c, i) => <li key={i} className="border-b border-rule py-3 text-sm text-ink"><time dateTime={c.date}>{formatDate(c.date)}</time> : {c.text}</li>)}</ul>
        ) : (
          <p className="mt-4 text-sm text-muted">Aucune correction à ce jour. Toute correction sera datée ici, à la même adresse.</p>
        )}
      </section>

      <section id="sources" aria-labelledby="sources-titre" className="mt-14 scroll-mt-20">
        <h2 id="sources-titre" className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">Sources</h2>
        <ol>
          {sources.map((s, i) => (
            <li key={s.url} className="flex gap-4 border-b border-rule py-3 text-sm" data-testid="source-item">
              <span className="font-mono text-accent">{String(i + 1).padStart(2, "0")}</span>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 font-medium text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-accent">
                {s.label}<span className="sr-only"> (nouvel onglet)</span>
              </a>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
