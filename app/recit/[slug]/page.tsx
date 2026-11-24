import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBadge, DemoNotice } from "@/components/DemoBadge";
import { Icon } from "@/components/Icon";
import { Chart } from "@/components/Chart";
import { ReadingProgress } from "@/components/ReadingProgress";
import { SaveButton, ShareButton } from "@/components/StoryActions";
import { StoryMediaFigure } from "@/components/StoryMediaFigure";
import { StoryTile } from "@/components/StoryTile";
import { TypeCover } from "@/components/TypeCover";
import { storyKeyword } from "@/lib/covers";
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

const kindStyles: Record<BlockKind, { label: string; hint: string }> = {
  fait: { label: "Faits", hint: "Ce qui est établi et doit être sourcé." },
  analyse: { label: "Analyse", hint: "Mécanismes et causes, selon notre lecture." },
  hypothese: { label: "Hypothèses", hint: "Ce qui pourrait se passer : rien n'est certain." },
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
      <ReadingProgress />
      <header className="mx-auto max-w-3xl px-5 pt-6 md:px-8 md:pt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
            <Icon name="arrow-left" className="size-4" />
            Retour au fil
          </Link>
          <DemoBadge label="Contenu illustratif" />
        </div>
        <p className="mt-10 text-meta text-muted">
          <Link href={`/explorer/?sujet=${topic.slug}`} className="font-semibold text-accent hover:underline">{topic.name}</Link> · {format.name} · {format.duration}
        </p>
        <h1 className="mt-2 font-display text-titre font-semibold text-ink text-balance">{story.title}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{story.dek}</p>
        <p className="mt-5 border-y border-rule py-3 text-meta text-muted">
          Publié le <time dateTime={story.publishedAt} className="font-mono">{formatDate(story.publishedAt)}</time> · mis à jour le{" "}
          <time dateTime={story.updatedAt} className="font-mono">{formatDate(story.updatedAt)}</time> · <span className="font-mono">{formatMinutes(story.minutes)}</span> ·
          dates fictives, utilisées pour la démonstration
        </p>
        <TypeCover word={storyKeyword(story)} className="mt-6 aspect-[21/9] w-full" />
      </header>

      <div className="mx-auto max-w-3xl px-5 md:px-8">
        <div className="mt-6 flex flex-wrap gap-3">
          <SaveButton slug={story.slug} title={story.title} />
          <ShareButton slug={story.slug} title={story.title} />
        </div>

        <DemoNotice className="mt-6" />

        <StoryMediaFigure slug={story.slug} />

        {/* L'essentiel */}
        <section aria-labelledby="essentiel" className="mt-10">
          <h2 id="essentiel" className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">
            L&apos;essentiel
          </h2>
          <ol className="grid md:grid-cols-3 md:gap-6">
            {story.keyPoints.map((point, i) => (
              <li key={i} className="border-b border-rule py-4 md:border-b-0">
                <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-ink">{point}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Légende faits / analyse / hypothèses */}
        <aside aria-label="Comment lire ce récit" className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-y border-rule py-4 text-xs text-muted">
          {(Object.keys(kindStyles) as BlockKind[]).map((k) => (
            <span key={k}>
              <strong className="font-semibold text-ink">{kindStyles[k].label}</strong> : {kindStyles[k].hint}
            </span>
          ))}
        </aside>

        {/* Corps du récit */}
        <div className="mt-8 space-y-10">
          {story.sections.map((section, i) => (
            <section key={i} aria-labelledby={`s-${i}`}>
              <p className="text-meta font-semibold text-muted">{kindStyles[section.kind].label}</p>
              <h2 id={`s-${i}`} className="mt-1 font-display text-intertitre font-semibold text-ink">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-4 text-[1.06rem] leading-[1.75] text-ink/90">
                {section.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
              {section.kind === "fait" && story.chart && i === 0 && (
                <div className="mt-6">
                  <Chart
                    title={story.chart.title}
                    unit={story.chart.unit}
                    period={story.chart.period}
                    source={{ label: story.chart.origin }}
                    points={story.chart.points}
                    type="courbe"
                  />
                </div>
              )}
            </section>
          ))}
        </div>

        {story.perspectives && story.perspectives.length > 0 && (
          <section aria-labelledby="perspectives" className="mt-12">
            <h2 id="perspectives" className="font-display text-intertitre font-semibold text-ink">
              Points de vue
            </h2>
            <p className="mt-1 text-sm text-muted">Les principales perspectives en présence, sans hiérarchie entre elles.</p>
            <ul className="mt-4 grid border-t border-rule md:grid-cols-3 md:gap-6">
              {story.perspectives.map((p) => (
                <li key={p.label} className="border-b border-rule py-4 md:border-b-0">
                  <p className="text-sm font-semibold text-ink">{p.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{p.text}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {story.uncertainties.length > 0 && (
          <section aria-labelledby="incertitudes" className="mt-12 border-l-2 border-amber pl-5">
            <h2 id="incertitudes" className="font-display text-xl font-semibold text-ink">
              Ce que l&apos;on ne sait pas encore
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[0.95rem] leading-relaxed text-ink/85">
              {story.uncertainties.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="sources" className="mt-12">
          <h2 id="sources" className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">
            Sources
          </h2>
          <ol>
            {story.sources.map((s, i) => (
              <li key={i} className="flex gap-4 border-b border-rule py-3 text-sm">
                <span className="font-mono text-demo">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="font-medium text-ink">{s.label} <span className="font-normal text-demo">(source fictive)</span></p>
                  <p className="mt-0.5 text-muted">{s.note}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted">
            Statut éditorial : <strong className="text-ink">démonstration, non relu</strong>. Aucune publication sans
            vérification des sources et validation humaine.
          </p>
        </section>

        {related.length > 0 && (
          <section aria-labelledby="suite" className="mt-16">
            <h2 id="suite" className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">
              Continuer à comprendre
            </h2>
            <div>
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
