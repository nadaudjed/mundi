import { NewsDate } from "@/components/NewsDate";
import type { Metadata } from "next";
import { frenchSpacing } from "@/lib/typo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { verificationLabel } from "@/lib/verification";
import { getVerifiedPublication as getPublication, verifiedPublications as publishedArticles } from "@/lib/verified";
import { getTopic } from "@/lib/topics";
import { ListenButton } from "@/components/ListenButton";
import {EditorialPhotoCredit} from "@/components/EditorialPhotoLayer";
import { SaveButton, ShareButton } from "@/components/StoryActions";
import { publicationKey, publicationPath } from "@/lib/publication-links";
import { SHARE_IMAGE, shareDefaults } from "@/lib/site";
import { Chart } from "@/components/Chart";
import { KeyFigure } from "@/components/KeyFigure";
import { MemoryCard } from "@/components/MemoryCard";
import { RelatedPublications } from "@/components/RelatedPublications";
import { feedPublications } from "@/lib/verified";
import { ReadingProgress } from "@/components/ReadingProgress";
import { keyFigureOf } from "@/lib/covers";
import { MundiCover } from "@/components/MundiCover";
import type { ComparisonCard } from "@/lib/data-cards";
import { DecryptageArticle } from "@/components/pilot/DecryptageArticle";
import { DossierLink } from "@/components/dossier/DossierLink";

type Params = { slug: string };
export function generateStaticParams(): Params[] {
  // Static export requires at least one generated path even before the first verified article.
  // This sentinel resolves to notFound() and is never linked from the site.
  return publishedArticles.length ? publishedArticles.map(a => ({ slug: a.slug })) : [{ slug: "aucune-publication" }];
}
export const dynamicParams = false;
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getPublication(slug);
  if (!a) return {};
  // Aperçu de partage : l'image du sujet quand elle est pertinente (carte du pilote, photo
  // d'archive ou photo de l'article), sinon l'image générale de MUNDI.
  // (Pilote seulement : les autres articles gardent l'image générale.)
  const v = a.decryptage?.visual;
  const image = v?.type === "carte"
    ? { url: `/media/pilote/${v.id}-partage.png`, width: 1200, height: 630, alt: v.alt }
    : v && a.photo ? { url: a.photo.src, alt: v.type === "archive" ? v.alt : a.photo.alt }
    : SHARE_IMAGE;
  const description = a.decryptage ? `${a.decryptage.essentiel.fait} ${a.decryptage.essentiel.consequence}` : a.summary;
  const title = a.decryptage?.shortTitle ?? a.title;
  return {
    title,
    description,
    alternates: { canonical: publicationPath(a.slug) },
    openGraph: { ...shareDefaults, type: "article", title, description, url: publicationPath(a.slug), publishedTime: a.publishedAt, modifiedTime: a.updatedAt, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
const labels = { fait: "Faits", analyse: "Analyse", hypothese: "Hypothèses" };
/** Sommaire discret à partir de quatre parties : en dessous, le texte se lit d'un coup d'œil. */
const TOC_MIN_SECTIONS = 4;
/** Durée de lecture estimée sur le texte réel (résumé et parties), à 200 mots par minute. */
function readingMinutes(texts: string[]) {
  const words = texts.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export default async function PublicationPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const a = getPublication(slug);
  if (!a) notFound();
  if (a.decryptage) return <DecryptageArticle a={a} d={a.decryptage} all={feedPublications} />;
  const topic = getTopic(a.topic);
  const figure = keyFigureOf(a);
  // Graphique : seulement une comparaison approuvée sur une échelle commune (même unité, même dénominateur).
  const minutes = readingMinutes([a.summary, ...a.sections.map((x) => x.text)]);
  const comparison = a.dataCards?.find((c): c is ComparisonCard => c.kind === "comparaison" && c.presentation === "echelle-commune");
  return (
    <article className="mx-auto max-w-6xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <ReadingProgress />
      <Link href="/actualites/" className="text-sm font-medium text-muted hover:text-ink">← Toutes les publications</Link>
      {/* Couverture asymétrique : un grand bloc pour le titre, une colonne étroite pour le chiffre clé. */}
      <header className={`mt-10 grid gap-8 ${figure ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-0" : ""}`}>
        <div className={figure ? "lg:pr-10" : "max-w-4xl"}>
          <p className="text-meta font-semibold text-accent">{topic?.name}</p>
          <NewsDate publication={a} className="mt-1 text-base font-semibold text-ink" />
          <h1 className="mt-2 font-display text-une font-semibold text-ink text-balance">{frenchSpacing(a.title)}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">{a.summary}</p>
        </div>
        {figure && (
          <div className="lg:border-l lg:border-rule lg:pl-10" data-testid="cover-key-figure">
            <p className="mb-2 text-meta text-muted">Le chiffre</p>
            <KeyFigure figure={figure} size="md" />
          </div>
        )}
      </header>
      <div className="mx-auto max-w-3xl lg:mx-0">
      {/* Une seule ligne grise : contrôle, dates, sources, crédit photo. */}
      <p className="mt-6 border-y border-rule py-3 text-meta text-muted" data-testid="publication-meta">
        {a.fixture && <strong className="mr-2 text-demo">Exemple de test, jamais publié.</strong>}
        <span className="font-semibold text-ink" data-testid="verification-label">{verificationLabel(a)}</span>
        {!a.aiVerified && <> ({a.reviewedBy})</>} · publié le <time dateTime={a.publishedAt}>{formatDate(a.publishedAt)}</time> · actualisé le{" "}
        <time dateTime={a.updatedAt}>{formatDate(a.updatedAt)}</time> ·{" "}
        <a href="#sources" className="underline underline-offset-2 hover:text-ink">{a.sources.length} sources</a> ·{" "}
        <span data-testid="reading-time">{minutes} min de lecture</span>
      </p>
      {a.photo && (
        <figure className="mt-6" data-testid="publication-photo">
          {/* Photo locale de Commons, sélectionnée thématiquement : jamais une preuve de l'événement. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.photo.src} alt={a.photo.alt} className="photo aspect-[3/2] w-full bg-night object-cover" loading="lazy" />
          <figcaption className="mt-2 text-meta leading-relaxed text-muted">
            <EditorialPhotoCredit photo={a.photo} />
          </figcaption>
        </figure>
      )}
      {!a.photo && !figure && (
        <div className="mt-6" data-testid="publication-cover">
          <MundiCover publication={a} tone="page" className="relative aspect-[16/9] w-full md:aspect-[21/9]" />
        </div>
      )}
      {a.corrections && a.corrections.length > 0 && (
        <aside className="mt-6 border-l-2 border-amber py-1 pl-4 text-sm text-ink" data-testid="corrections" aria-label="Corrections">
          <p className="font-semibold">Correction{a.corrections.length > 1 ? "s" : ""} apportée{a.corrections.length > 1 ? "s" : ""} à cet article</p>
          <ul className="mt-2 space-y-1">{a.corrections.map((c, i) => <li key={i}><time dateTime={c.date}>{formatDate(c.date)}</time> : {c.text}</li>)}</ul>
        </aside>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SaveButton slug={publicationKey(a.slug)} title={a.title} />
        <ShareButton slug={a.slug} path={publicationPath(a.slug)} title={a.title} />
        <ListenButton title={a.title} summary={a.summary} points={a.keyPoints} tone="light" audioSrc={a.audio} />
      </div>
      <DossierLink slug={a.slug} />
      {a.sections.length >= TOC_MIN_SECTIONS && (
        <nav aria-label="Sommaire" className="mt-8 border-l-2 border-rule pl-4" data-testid="article-toc">
          <p className="text-meta font-semibold text-muted">Sommaire</p>
          <ol className="mt-2 space-y-1.5 text-sm">
            {a.sections.map((s, i) => (
              <li key={i}><a href={`#partie-${i + 1}`} className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-accent">{s.heading}</a></li>
            ))}
            <li><a href="#sources" className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-accent">Sources</a></li>
          </ol>
        </nav>
      )}
      {a.sections.map((s, i) => (
        <section key={i} id={`partie-${i + 1}`} className="mt-12 scroll-mt-20">
          <p className="text-meta font-semibold text-muted">{labels[s.kind]}</p>
          <h2 className="mt-1 font-display text-intertitre font-semibold text-ink">{s.heading}</h2>
          <p className="mt-4 whitespace-pre-line text-[1.06rem] leading-[1.8] text-ink/90">{s.text}</p>
          {comparison && i === a.sections.findIndex((x) => x.kind === "fait") && (
            <div className="mt-8">
              <Chart
                title={comparison.headline}
                unit={comparison.items[0].unit}
                period={[...new Set(comparison.items.map((x) => x.period))].join(", ")}
                source={comparison.source}
                points={comparison.items.map((m) => ({ label: new Set(comparison.items.map((x) => x.period)).size > 1 ? `${m.label} (${m.period})` : m.label, value: m.value }))}
                decimals={comparison.items[0].decimals}
                note={comparison.note}
              />
            </div>
          )}
        </section>
      ))}
      <MemoryCard points={a.keyPoints} />
      <RelatedPublications publication={a} all={feedPublications} />
      <section id="sources" className="mt-14 scroll-mt-20" aria-labelledby="sources-titre">
        <h2 id="sources-titre" className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">Sources</h2>
        <ol>{a.sources.map((s, i) => (
          <li key={s.url} className="flex gap-4 border-b border-rule py-3 text-sm" data-testid="source-item">
            <span className="font-mono text-accent">{String(i + 1).padStart(2, "0")}</span>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="group/source min-w-0">
              <span className="block font-medium text-ink underline decoration-rule-strong underline-offset-4 group-hover/source:decoration-accent">{s.label}</span>
              <span className="mt-0.5 block font-mono text-[0.78rem] break-all text-muted">{s.url}</span>
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          </li>
        ))}</ol>
      </section>
      </div>
    </article>
  );
}
