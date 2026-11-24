import type { Metadata } from "next";
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
  return {
    title: a.title,
    description: a.summary,
    alternates: { canonical: publicationPath(a.slug) },
    openGraph: { ...shareDefaults, type: "article", title: a.title, description: a.summary, url: publicationPath(a.slug), publishedTime: a.publishedAt, modifiedTime: a.updatedAt },
    twitter: { card: "summary_large_image", title: a.title, description: a.summary, images: [SHARE_IMAGE.url] },
  };
}
const labels = { fait: "Faits", analyse: "Analyse", hypothese: "Hypothèses" };

export default async function PublicationPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const a = getPublication(slug);
  if (!a) notFound();
  const topic = getTopic(a.topic);
  return (
    <article className="mx-auto max-w-3xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <Link href="/actualites/" className="text-sm font-medium text-muted hover:text-ink">← Toutes les publications</Link>
      <p className="mt-10 text-meta font-semibold text-accent">{topic?.name}</p>
      <h1 className="mt-2 font-display text-titre font-semibold text-ink text-balance">{a.title}</h1>
      <p className="mt-5 text-lg leading-relaxed text-muted">{a.summary}</p>
      {/* Une seule ligne grise : contrôle, dates, sources, crédit photo. */}
      <p className="mt-6 border-y border-rule py-3 text-meta text-muted" data-testid="publication-meta">
        {a.fixture && <strong className="mr-2 text-[#7a5410]">Exemple de test, jamais publié.</strong>}
        <span className="font-semibold text-ink" data-testid="verification-label">{verificationLabel(a)}</span>
        {!a.aiVerified && <> ({a.reviewedBy})</>} · publié le <time dateTime={a.publishedAt} className="font-mono">{formatDate(a.publishedAt)}</time> · actualisé le{" "}
        <time dateTime={a.updatedAt} className="font-mono">{formatDate(a.updatedAt)}</time> ·{" "}
        <a href="#sources" className="underline underline-offset-2 hover:text-ink"><span className="font-mono">{a.sources.length}</span> sources</a>
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
      {a.corrections && a.corrections.length > 0 && (
        <aside className="mt-6 border-l-2 border-amber py-1 pl-4 text-sm text-ink" data-testid="corrections" aria-label="Corrections">
          <p className="font-semibold">Correction{a.corrections.length > 1 ? "s" : ""} apportée{a.corrections.length > 1 ? "s" : ""} à cet article</p>
          <ul className="mt-2 space-y-1">{a.corrections.map((c, i) => <li key={i}><time dateTime={c.date} className="font-mono">{formatDate(c.date)}</time> : {c.text}</li>)}</ul>
        </aside>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SaveButton slug={publicationKey(a.slug)} title={a.title} />
        <ShareButton slug={a.slug} path={publicationPath(a.slug)} title={a.title} />
        <ListenButton title={a.title} summary={a.summary} points={a.keyPoints} tone="light" />
      </div>
      <section className="mt-10" aria-labelledby="idees">
        <h2 id="idees" className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">Trois idées à retenir</h2>
        <ol>{a.keyPoints.map((point, i) => (
          <li key={i} className="flex gap-4 border-b border-rule py-3 leading-relaxed text-ink">
            <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
            <span>{point}</span>
          </li>
        ))}</ol>
      </section>
      {a.sections.map((s, i) => (
        <section key={i} className="mt-12">
          <p className="text-meta font-semibold text-muted">{labels[s.kind]}</p>
          <h2 className="mt-1 font-display text-intertitre font-semibold text-ink">{s.heading}</h2>
          <p className="mt-4 whitespace-pre-line text-[1.06rem] leading-[1.8] text-ink/90">{s.text}</p>
        </section>
      ))}
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
    </article>
  );
}
