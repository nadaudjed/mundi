import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBadge, DemoNotice } from "@/components/DemoBadge";
import { Icon } from "@/components/Icon";
import { MiniChart } from "@/components/MiniChart";
import { SaveButton, ShareButton } from "@/components/StoryActions";
import { StoryTile } from "@/components/StoryTile";
import { StoryVisual } from "@/components/StoryVisual";
import { formatDate, formatMinutes } from "@/lib/format";
import { getStory, relatedStories, stories } from "@/lib/stories";
import { formats, getTopic } from "@/lib/topics";
import type { BlockKind } from "@/lib/types";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return stories.map((s) => ({ slug: s.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) return {};
  return { title: `${story.title} (démonstration)`, description: story.dek };
}

const kindStyles: Record<BlockKind, { label: string; className: string; hint: string }> = {
  fait: { label: "Faits", className: "bg-blue/10 text-blue ring-blue/25", hint: "Ce qui est établi et doit être sourcé." },
  analyse: { label: "Analyse", className: "bg-mint/12 text-[#0f6e5b] ring-mint/30", hint: "Mécanismes et causes, selon notre lecture." },
  hypothese: { label: "Hypothèses", className: "bg-amber/15 text-[#7a5410] ring-amber/35", hint: "Ce qui pourrait se passer : rien n'est certain." },
};

export default async function StoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) notFound();

  const topic = getTopic(story.topic)!;
  const format = formats[story.format];
  const related = relatedStories(story);

  return (
    <article className="pb-[calc(var(--nav-h)+3rem)] md:pb-20">
      {/* En-tête */}
      <header className="relative overflow-hidden bg-night text-ivory">
        <StoryVisual pattern={topic.pattern} color={topic.color} seed={story.slug} className="absolute inset-0 h-full w-full opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/85 to-night/40" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl px-5 pt-6 pb-10 md:px-8 md:pt-10 md:pb-14">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-ivory/10 px-3 py-1.5 text-sm font-medium text-ivory/90 backdrop-blur hover:bg-ivory/20">
              <Icon name="arrow-left" className="size-4" />
              Retour au fil
            </Link>
            <DemoBadge tone="light" label="Contenu illustratif" />
          </div>

          <div className="mt-16 flex flex-wrap items-center gap-2 text-xs font-semibold md:mt-24">
            <Link href={`/explorer/?sujet=${topic.slug}`} className="rounded-full px-2.5 py-1 text-night hover:opacity-90" style={{ background: topic.color }}>
              {topic.name}
            </Link>
            <span className="rounded-full border border-ivory/30 px-2.5 py-1">
              {format.name} · {format.duration}
            </span>
          </div>
          <h1 className="animate-rise mt-4 font-display text-4xl leading-[1.08] font-semibold text-balance md:text-[3.25rem]">{story.title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ivory/80">{story.dek}</p>

          <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ivory/70">
            <div className="flex gap-1.5">
              <dt>Publié le</dt>
              <dd className="font-medium text-ivory">
                <time dateTime={story.publishedAt}>{formatDate(story.publishedAt)}</time>
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Mis à jour le</dt>
              <dd className="font-medium text-ivory">
                <time dateTime={story.updatedAt}>{formatDate(story.updatedAt)}</time>
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Durée</dt>
              <Icon name="clock" className="size-4" />
              <dd className="font-medium text-ivory">{formatMinutes(story.minutes)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-ivory/55">Dates fictives, utilisées pour la démonstration.</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 md:px-8">
        <div className="-mt-5 flex flex-wrap gap-2 rounded-2xl bg-paper p-3 shadow-lg shadow-night/10 ring-1 ring-night/8 relative">
          <SaveButton slug={story.slug} title={story.title} />
          <ShareButton slug={story.slug} title={story.title} />
        </div>

        <DemoNotice className="mt-6" />

        {/* L'essentiel */}
        <section aria-labelledby="essentiel" className="mt-10">
          <h2 id="essentiel" className="text-xs font-semibold uppercase tracking-[0.2em] text-blue">
            L&apos;essentiel
          </h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {story.keyPoints.map((point, i) => (
              <li key={i} className="rounded-2xl bg-paper p-4 ring-1 ring-night/8">
                <span className="font-display text-2xl font-semibold text-mint">{i + 1}</span>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-night">{point}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Légende faits / analyse / hypothèses */}
        <aside aria-label="Comment lire ce récit" className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-y border-night/10 py-4 text-xs text-muted">
          {(Object.keys(kindStyles) as BlockKind[]).map((k) => (
            <span key={k} className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ${kindStyles[k].className}`}>{kindStyles[k].label}</span>
              {kindStyles[k].hint}
            </span>
          ))}
        </aside>

        {/* Corps du récit */}
        <div className="mt-8 space-y-10">
          {story.sections.map((section, i) => (
            <section key={i} aria-labelledby={`s-${i}`}>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${kindStyles[section.kind].className}`}>
                {kindStyles[section.kind].label}
              </span>
              <h2 id={`s-${i}`} className="mt-3 font-display text-2xl font-semibold text-night md:text-3xl">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-4 text-[1.06rem] leading-[1.75] text-night/90">
                {section.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
              {section.kind === "fait" && story.chart && i === 0 && (
                <div className="mt-6">
                  <MiniChart chart={story.chart} color={topic.color} />
                </div>
              )}
            </section>
          ))}
        </div>

        {story.perspectives && story.perspectives.length > 0 && (
          <section aria-labelledby="perspectives" className="mt-12">
            <h2 id="perspectives" className="font-display text-2xl font-semibold text-night">
              Points de vue
            </h2>
            <p className="mt-1 text-sm text-muted">Les principales perspectives en présence, sans hiérarchie entre elles.</p>
            <ul className="mt-4 grid gap-3 md:grid-cols-3">
              {story.perspectives.map((p) => (
                <li key={p.label} className="rounded-2xl border border-night/10 p-4">
                  <p className="text-sm font-semibold text-night">{p.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{p.text}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {story.uncertainties.length > 0 && (
          <section aria-labelledby="incertitudes" className="mt-12 rounded-3xl bg-ivory-2/70 p-6">
            <h2 id="incertitudes" className="font-display text-xl font-semibold text-night">
              Ce que l&apos;on ne sait pas encore
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[0.95rem] leading-relaxed text-night/85">
              {story.uncertainties.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="sources" className="mt-12">
          <h2 id="sources" className="font-display text-xl font-semibold text-night">
            Sources
          </h2>
          <ol className="mt-3 space-y-3">
            {story.sources.map((s, i) => (
              <li key={i} className="flex gap-3 rounded-2xl border border-dashed border-amber/60 bg-amber/5 p-4 text-sm">
                <span className="font-semibold text-[#7a5410]">[{i + 1}]</span>
                <div>
                  <p className="font-medium text-night">{s.label}</p>
                  <p className="mt-0.5 text-muted">{s.note}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted">
            Statut éditorial : <strong className="text-night">démonstration, non relu</strong>. Aucune publication sans
            vérification des sources et validation humaine.
          </p>
        </section>

        {related.length > 0 && (
          <section aria-labelledby="suite" className="mt-16">
            <h2 id="suite" className="font-display text-2xl font-semibold text-night">
              Continuer à comprendre
            </h2>
            <div className="mt-4 grid gap-3">
              {related.map((s) => (
                <StoryTile key={s.slug} story={s} />
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
