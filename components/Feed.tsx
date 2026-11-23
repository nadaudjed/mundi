"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatMinutes } from "@/lib/format";
import { getNarrative, type NarrativeBeat } from "@/lib/narratives";
import { feedStories } from "@/lib/stories";
import { personalizedStories, useInterests } from "@/lib/preferences";
import { formats, getTopic, inkOn, topics } from "@/lib/topics";
import type { Story, TopicSlug } from "@/lib/types";
import { publishedArticles } from "@/lib/editorial";
import { DemoBadge } from "./DemoBadge";
import { InstallChip } from "./InstallButton";
import { Icon } from "./Icon";
import { LogoMark } from "./Logo";
import { ListenButton } from "./ListenButton";
import { SaveButton, ShareButton } from "./StoryActions";
import { MediaStage } from "./MediaStage";

/**
 * Un écran du fil. Un récit « narratif » occupe trois écrans successifs
 * (accroche, fait, explication) ; les autres récits en occupent un seul.
 */
type Slide = { key: string; story: Story; storyIndex: number; beat?: NarrativeBeat; step: number; steps: number };

function toSlides(stories: Story[]): Slide[] {
  return stories.flatMap((story, storyIndex) => {
    const beats = getNarrative(story.slug);
    if (!beats) return [{ key: story.slug, story, storyIndex, step: 0, steps: 1 }];
    return beats.map((beat, step) => ({ key: `${story.slug}#${step}`, story, storyIndex, beat, step, steps: beats.length }));
  });
}

/** Sujets réellement présents dans le fil, pour ne pas proposer de filtre vide. */
const feedTopics = topics.filter((t) => feedStories.some((s) => s.topic === t.slug));

export function Feed() {
  const [filter, setFilter] = useState<TopicSlug | "all">("all");
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const { interests } = useInterests();

  const items = useMemo(
    () => (filter === "all" ? personalizedStories(feedStories, interests) : feedStories.filter((s) => s.topic === filter)),
    [filter, interests],
  );
  const slides = useMemo(() => toSlides(items), [items]);
  const current = active < slides.length ? slides[active] : undefined;
  const atEnd = active >= slides.length;

  // Repère la carte visible pour l'indicateur de progression.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [slides]);

  const goTo = useCallback((index: number) => {
    const root = scroller.current;
    if (!root) return;
    const clamped = Math.max(0, Math.min(index, root.children.length - 1));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (root.children[clamped] as HTMLElement | undefined)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, []);

  // Navigation au clavier : flèches, j/k, Page suivante/précédente.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable]")) return;
      if (["ArrowDown", "PageDown", "j"].includes(e.key)) {
        e.preventDefault();
        goTo(active + 1);
      } else if (["ArrowUp", "PageUp", "k"].includes(e.key)) {
        e.preventDefault();
        goTo(active - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo]);

  function changeFilter(next: TopicSlug | "all") {
    setFilter(next);
    setActive(0);
    scroller.current?.scrollTo({ top: 0 });
  }

  return (
    <div className="feed-h relative bg-night md:bg-ivory">
      {/* Barre supérieure superposée (mobile) / au-dessus de la carte (ordinateur) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-night/90 via-night/50 to-transparent pb-6 pt-[max(env(safe-area-inset-top),0.75rem)] md:hidden">
        <div className="pointer-events-auto mx-auto flex max-w-[30rem] items-center justify-between px-4 md:hidden">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-[0.22em] text-ivory" aria-label="MUNDI">
            <LogoMark className="size-6" />
            MUNDI
          </Link>
          <div className="flex items-center gap-2">
            <InstallChip />
            <DemoBadge tone="light" />
          </div>
        </div>
        <div
          role="group"
          aria-label="Filtrer le fil par sujet"
          className="no-scrollbar pointer-events-auto mx-auto mt-3 flex max-w-[30rem] gap-2 overflow-x-auto px-4"
        >
          <FilterChip label="Pour vous" active={filter === "all"} onClick={() => changeFilter("all")} />
          <Link href="/mes-sujets/" className="shrink-0 rounded-full border border-mint/60 px-3.5 py-1.5 text-[0.8rem] font-medium text-mint-soft hover:bg-mint/15">Personnaliser</Link>
          {feedTopics.map((t) => (
            <FilterChip key={t.slug} label={t.name} color={t.color} active={filter === t.slug} onClick={() => changeFilter(t.slug)} />
          ))}
        </div>
      </div>

      <div className="relative mx-auto flex h-full max-w-6xl items-stretch justify-center md:gap-8 md:px-6 md:py-6">
        {/* Filtres par sujet (ordinateur) */}
        <aside className="hidden w-52 shrink-0 flex-col md:flex" aria-label="Filtrer le fil par sujet">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue">Votre fil</p>
          <p className="mt-2 font-display text-2xl leading-tight font-semibold text-night">Comprendre le monde, un récit à la fois.</p>
          <Link href="/mes-sujets/" className="mt-4 inline-flex items-center gap-2 self-start rounded-full border border-blue/30 px-3 py-1.5 text-xs font-semibold text-blue hover:bg-blue/10"><Icon name="sliders" className="size-4" /> Personnaliser mon fil</Link>
          {interests.length > 0 && <p className="mt-2 text-xs text-muted">{interests.length} centre{interests.length > 1 ? "s" : ""} d’intérêt · des découvertes restent proposées</p>}
          <ul className="no-scrollbar mt-5 -ml-3 space-y-0.5 overflow-y-auto">
            <li>
              <SideFilter label="Pour vous" active={filter === "all"} onClick={() => changeFilter("all")} />
            </li>
            {feedTopics.map((t) => (
              <li key={t.slug}>
                <SideFilter label={t.name} color={t.color} active={filter === t.slug} onClick={() => changeFilter(t.slug)} />
              </li>
            ))}
          </ul>
        </aside>

        <div
          ref={scroller}
          aria-label="Fil de découverte"
          className="no-scrollbar h-full w-full touch-pan-y snap-y snap-mandatory overflow-y-scroll overscroll-y-contain md:max-w-[27rem] md:rounded-[2rem] md:shadow-2xl md:shadow-night/30 md:ring-1 md:ring-night/10"
        >
          {slides.map((slide, i) => (
            <FeedCard key={slide.key} slide={slide} index={i} total={items.length} active={i === active} near={Math.abs(i - active) <= 1} />
          ))}
          <TransitionCard index={slides.length} onRestart={() => goTo(0)} />
        </div>

        {/* Commandes et repères (ordinateur) */}
        <div className="hidden w-52 shrink-0 flex-col justify-center gap-6 md:flex">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              className="flex size-12 items-center justify-center rounded-full bg-night text-ivory shadow-lg transition hover:bg-blue disabled:opacity-30"
              aria-label="Écran précédent"
            >
              <Icon name="chevron-up" className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={active >= slides.length}
              className="flex size-12 items-center justify-center rounded-full bg-night text-ivory shadow-lg transition hover:bg-blue disabled:opacity-30"
              aria-label="Écran suivant"
            >
              <Icon name="chevron-down" className="size-6" />
            </button>
          </div>
          <p className="text-sm text-muted" aria-live="polite" data-testid="feed-counter">
            {atEnd ? (
              <span className="font-display text-2xl text-night">Fin du fil</span>
            ) : (
              <>
                <span className="font-display text-3xl text-night">{(current?.storyIndex ?? 0) + 1}</span> / {items.length}
                {current && current.steps > 1 && (
                  <span className="mt-1 block text-xs">
                    Écran {current.step + 1} sur {current.steps}
                  </span>
                )}
              </>
            )}
          </p>
          <p className="text-xs leading-relaxed text-muted">
            Astuce : utilisez les flèches <kbd className="rounded border border-night/20 px-1">↑</kbd>{" "}
            <kbd className="rounded border border-night/20 px-1">↓</kbd> du clavier.
          </p>
        </div>
      </div>
    </div>
  );
}

function SideFilter({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-sm font-medium transition-colors ${
        active ? "bg-night text-ivory" : "text-night/75 hover:bg-night/5 hover:text-night"
      }`}
    >
      <span className="size-2 rounded-full" style={{ background: color ?? "#20B99A" }} aria-hidden="true" />
      {label}
    </button>
  );
}

function FilterChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[0.8rem] font-medium transition-colors ${
        active
          ? "border-ivory bg-ivory text-night md:border-night md:bg-night md:text-ivory"
          : "border-ivory/25 bg-night/40 text-ivory/85 hover:border-ivory/60 md:border-night/15 md:bg-transparent md:text-night/75 md:hover:border-night/40"
      }`}
    >
      {color && <span className="size-2 rounded-full" style={{ background: color }} aria-hidden="true" />}
      {label}
    </button>
  );
}

function FeedCard({ slide, index, total, active, near }: { slide: Slide; index: number; total: number; active: boolean; near: boolean }) {
  const { story, beat, step, steps, storyIndex } = slide;
  const topic = getTopic(story.topic)!;
  const format = formats[story.format];
  const last = step === steps - 1;

  return (
    <article
      data-index={index}
      data-story={story.slug}
      aria-roledescription={beat ? "écran de récit" : "récit"}
      aria-label={`Récit ${storyIndex + 1} sur ${total}${beat ? `, écran ${step + 1} sur ${steps}` : ""} : ${story.title}`}
      className="relative flex h-full snap-start snap-always flex-col overflow-hidden bg-night text-ivory"
    >
      <MediaStage story={story} active={active} near={near} />
      <div className="grain pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night from-25% via-night/70 via-42% to-transparent to-62%" aria-hidden="true" />

      {beat && (
        <div className="absolute inset-x-5 bottom-2.5 z-10 flex gap-1.5" aria-hidden="true" data-testid="narrative-progress">
          {Array.from({ length: steps }, (_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-mint" : "bg-ivory/25"}`} />
          ))}
        </div>
      )}

      <div className="pointer-events-none relative mt-auto flex items-end gap-2 px-5 pb-6 pt-32 md:px-6 md:pb-8">
        <div className="pointer-events-auto min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.75rem] font-semibold">
            <span className="rounded-full px-2.5 py-1" style={{ background: topic.color, color: inkOn(topic.color) }}>
              {topic.name}
            </span>
            <span className="rounded-full border border-ivory/25 px-2.5 py-1 text-ivory/90">{format.name}</span>
            <span className="flex items-center gap-1 text-ivory/70">
              <Icon name="clock" className="size-3.5" />
              {formatMinutes(story.minutes)}
            </span>
          </div>

          {beat ? (
            <NarrativeBody slide={slide} />
          ) : (
            <SummaryBody story={story} />
          )}

          {last && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={`/recit/${story.slug}/`}
                className="inline-flex items-center gap-2 rounded-full bg-mint px-5 py-2.5 text-sm font-semibold text-night transition hover:bg-mint-soft"
              >
                Comprendre
                <Icon name="arrow-right" className="size-4" />
              </Link>
              <ListenButton title={story.title} summary={story.dek} points={story.keyPoints} active={active} />
              <span className="text-[0.65rem] leading-tight font-medium uppercase tracking-wider text-[#ffd98f]/90">
                Contenu
                <br />
                illustratif
              </span>
            </div>
          )}
          {!last && (
            <p className="mt-5 flex items-center gap-1.5 text-xs font-medium text-ivory/65">
              <Icon name="chevron-down" className="size-4 motion-safe:animate-bounce" />
              Faites défiler pour la suite
            </p>
          )}
        </div>

        <div className="pointer-events-auto flex shrink-0 flex-col items-center gap-1 self-end pb-12">
          <SaveButton slug={story.slug} title={story.title} variant="rail" />
          <ShareButton slug={story.slug} title={story.title} variant="rail" />
        </div>
      </div>

      {index === 0 && !beat && total > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex justify-center text-ivory/50 md:hidden" aria-hidden="true">
          <Icon name="chevron-down" className="size-5 motion-safe:animate-bounce" />
        </div>
      )}
    </article>
  );
}

/** Carte classique : titre, chapeau et trois points clés. */
function SummaryBody({ story }: { story: Story }) {
  return (
    <>
      <h2 className="font-display text-[1.75rem] leading-[1.12] font-semibold text-balance md:text-[1.9rem]">{story.title}</h2>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-ivory/80 [@media(max-height:700px)]:hidden">{story.dek}</p>
      <ol className="mt-4 space-y-2">
        {story.keyPoints.map((point, i) => (
          <li key={i} className="flex gap-3 text-[0.85rem] leading-snug text-ivory/90">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-mint/20 text-[0.7rem] font-bold text-mint-soft">
              {i + 1}
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

/** Carte narrative : une seule idée par écran. */
function NarrativeBody({ slide }: { slide: Slide }) {
  const { story, beat, step } = slide;
  if (!beat) return null;
  return (
    <div className="motion-safe:animate-rise">
      {step === 0 ? (
        <h2 className="mb-3 text-sm font-semibold text-ivory/75">{story.title}</h2>
      ) : (
        <p className="mb-3 text-sm font-semibold text-ivory/75">{story.title}</p>
      )}
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-mint-soft">{beat.label}</p>
      <p className="mt-2 font-display text-[1.7rem] leading-[1.18] font-semibold text-balance md:text-[1.85rem]">{beat.text}</p>
    </div>
  );
}

/**
 * Dernier écran du fil : sépare clairement les récits illustratifs des futurs
 * récits vérifiés par la rédaction. N'affiche aucune information non revue.
 */
function TransitionCard({ index, onRestart }: { index: number; onRestart: () => void }) {
  const count = publishedArticles.length;
  return (
    <article
      data-index={index}
      data-testid="feed-transition"
      aria-label="Fin des récits illustratifs"
      className="relative flex h-full snap-start snap-always flex-col justify-end overflow-hidden bg-night px-6 pt-32 pb-10 text-ivory"
    >
      <div className="grain pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffd98f]">Fin des récits illustratifs</p>
        <h2 className="mt-3 font-display text-[1.9rem] leading-[1.12] font-semibold text-balance">Bientôt : les récits vérifiés de la rédaction</h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-ivory/80">
          Ce que vous venez de parcourir sert à tester MUNDI. Les prochains récits s&apos;appuieront sur des sources réelles,
          vérifiées et relues par une personne avant publication.
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-ivory/5 p-3 ring-1 ring-amber/40">
            <dt className="text-xs font-bold uppercase tracking-wider text-[#ffd98f]">Démonstration</dt>
            <dd className="mt-1 text-ivory/80">Exemple pédagogique, sources fictives.</dd>
          </div>
          <div className="rounded-2xl bg-ivory/5 p-3 ring-1 ring-mint/50">
            <dt className="text-xs font-bold uppercase tracking-wider text-mint-soft">Vérifié</dt>
            <dd className="mt-1 text-ivory/80">Sources réelles, date, relecteur nommé.</dd>
          </div>
        </dl>
        <p className="mt-5 text-sm font-medium text-ivory/90" data-testid="verified-count">
          {count === 0
            ? "Aucune publication vérifiée pour l'instant."
            : `${count} publication${count > 1 ? "s" : ""} vérifiée${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""}.`}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/actualites/" className="inline-flex items-center gap-2 rounded-full bg-mint px-5 py-2.5 text-sm font-semibold text-night hover:bg-mint-soft">
            Publications vérifiées
            <Icon name="arrow-right" className="size-4" />
          </Link>
          <button type="button" onClick={onRestart} className="rounded-full border border-ivory/35 px-5 py-2.5 text-sm font-semibold text-ivory hover:border-ivory/80">
            Revoir depuis le début
          </button>
        </div>
      </div>
    </article>
  );
}
