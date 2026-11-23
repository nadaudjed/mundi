import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { getVerifiedPublication as getPublication, verifiedPublications as publishedArticles } from "@/lib/verified";
import { getTopic } from "@/lib/topics";
import { ListenButton } from "@/components/ListenButton";
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
  return (
    <article className="mx-auto max-w-3xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-14 md:pb-20">
      <Link href="/actualites/" className="text-sm font-semibold text-blue underline underline-offset-4">Toutes les publications</Link>
      <p className="mt-10 text-xs font-semibold uppercase tracking-wider text-blue">{getTopic(a.topic)?.name} · {a.aiVerified ? "Vérifiée par l’IA, sans relecture humaine" : "Publication relue"}</p>
      <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-night md:text-5xl">{a.title}</h1>
      <p className="mt-5 text-lg leading-relaxed text-muted">{a.summary}</p>
      <p className="mt-6 border-y border-night/10 py-4 text-sm text-muted" data-testid="publication-meta">{a.fixture && <strong className="mr-2 text-[#7a5410]">Exemple de test, jamais publié.</strong>}Publié le <time dateTime={a.publishedAt}>{formatDate(a.publishedAt)}</time> · Actualisé le <time dateTime={a.updatedAt}>{formatDate(a.updatedAt)}</time> · Validation : {a.aiVerified ? <strong className="font-semibold text-night" data-testid="ai-verified">vérification automatique par l&apos;IA MUNDI, sans relecture humaine</strong> : a.reviewedBy}</p>
      {a.corrections && a.corrections.length > 0 && (
        <aside className="mt-6 rounded-2xl bg-[#fff6e5] p-5 text-sm text-night ring-1 ring-[#e0b45a]" data-testid="corrections" aria-label="Corrections">
          <p className="font-semibold">Correction{a.corrections.length > 1 ? "s" : ""} apportée{a.corrections.length > 1 ? "s" : ""} à cet article</p>
          <ul className="mt-2 space-y-1">{a.corrections.map((c, i) => <li key={i}><time dateTime={c.date}>{formatDate(c.date)}</time> : {c.text}</li>)}</ul>
        </aside>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SaveButton slug={publicationKey(a.slug)} title={a.title} />
        <ShareButton slug={a.slug} path={publicationPath(a.slug)} title={a.title} />
        <ListenButton title={a.title} summary={a.summary} points={a.keyPoints} tone="light" />
      </div>
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-night">Trois idées à retenir</h2>
        <ol className="mt-5 space-y-3">{a.keyPoints.map((point,i) => <li key={i} className="rounded-2xl bg-paper p-5 ring-1 ring-night/10"><strong className="mr-3 text-blue">{i+1}.</strong>{point}</li>)}</ol>
      </section>
      {a.sections.map((s,i) => (
        <section key={i} className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue">{labels[s.kind]}</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-night">{s.heading}</h2>
          <p className="mt-4 whitespace-pre-line text-base leading-[1.85] text-night/90">{s.text}</p>
        </section>
      ))}
      <section className="mt-14 border-t border-night/15 pt-8">
        <h2 className="font-display text-2xl font-semibold text-night">Sources</h2>
        <ol className="mt-5 space-y-3">{a.sources.map((s,i) => <li key={s.url} className="rounded-xl bg-paper p-4 ring-1 ring-night/10">
          <span className="mr-2 font-semibold text-blue">{i+1}.</span>
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue underline underline-offset-4">{s.label}</a>
        </li>)}</ol>
      </section>
    </article>
  );
}
