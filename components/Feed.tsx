"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatMinutes } from "@/lib/format";
import { getNarrative, type NarrativeBeat } from "@/lib/narratives";
import { feedStories } from "@/lib/stories";
import { personalizedStories, useInterests } from "@/lib/preferences";
import { formats, getTopic, topics } from "@/lib/topics";
import type { Story, TopicSlug } from "@/lib/types";
import type { FeedPublication } from "@/lib/verified";
import { DemoBadge } from "./DemoBadge";
import { InstallChip } from "./InstallButton";
import { Icon } from "./Icon";
import { LogoMark } from "./Logo";
import { ListenButton } from "./ListenButton";
import { SaveButton, ShareButton } from "./StoryActions";
import { MediaStage } from "./MediaStage";
import { VerifiedCard, type CardVisual } from "./VerifiedCard";
import { DataCardView } from "./data-cards/DataCardView";
import type { DataCard } from "@/lib/data-cards";
import { publicationPath } from "@/lib/publication-links";

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

/**
 * Entrées du fil unique : d'abord les publications vérifiées (si elles
 * existent), puis un écran de séparation, puis les démonstrations.
 */
type Entry =
  | { kind: "verified"; key: string; publication: FeedPublication; position: number; visual: CardVisual }
  | { kind: "data"; key: string; publication: FeedPublication; card: DataCard; position: number; total: number }
  | { kind: "divider"; key: string }
  | { kind: "story"; key: string; slide: Slide };

type Props = {
  /** Publications vérifiées, fournies au moment de la construction (jamais de brouillon). */
  verified?: FeedPublication[];
};

export function Feed({ verified = [] }: Props) {
  const [filter, setFilter] = useState<TopicSlug | "all">("all");
  const [active, setActive] = useState(0);
  const [topicsOpen, setTopicsOpen] = useState(false);
  /** Écrans déjà révélés : leur texte reste affiché quand on revient en arrière. */
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([0]));
  // Les révélations typographiques ne masquent le texte qu'une fois le fil interactif.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => root.current?.setAttribute("data-motion", "ready"), []);
  const scroller = useRef<HTMLDivElement>(null);
  const { interests } = useInterests();

  const items = useMemo(
    () => (filter === "all" ? personalizedStories(feedStories, interests) : feedStories.filter((s) => s.topic === filter)),
    [filter, interests],
  );
  const slides = useMemo(() => toSlides(items), [items]);
  const publications = useMemo(() => (filter === "all" ? verified : verified.filter((p) => p.topic === filter)), [filter, verified]);
  const entries = useMemo<Entry[]>(() => {
    // Chaque publication approuvée peut être suivie de sa séquence de cartes de données.
    const list: Entry[] = publications.flatMap((publication, position): Entry[] => [
      { kind: "verified", key: `pub:${publication.slug}`, publication, position, visual: position % 2 === 0 ? "motif" : "sobre" },
      ...(publication.dataCards ?? []).map((card, i, all): Entry => ({
        kind: "data",
        key: `pub:${publication.slug}:${card.id}`,
        publication,
        card,
        position: i,
        total: all.length,
      })),
    ]);
    if (list.length > 0 && slides.length > 0) list.push({ kind: "divider", key: "divider" });
    return list.concat(slides.map((slide) => ({ kind: "story", key: slide.key, slide })));
  }, [publications, slides]);
  /** Sujets réellement présents dans le fil, pour ne pas proposer de filtre vide. */
  const feedTopics = useMemo(() => topics.filter((t) => feedStories.some((s) => s.topic === t.slug) || verified.some((p) => p.topic === t.slug)), [verified]);
  const entry = active < entries.length ? entries[active] : undefined;
  const current = entry?.kind === "story" ? entry.slide : undefined;
  const atEnd = active >= entries.length;

  // Repère la carte visible pour l'indicateur de progression.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          setActive(index);
          setSeen((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
        }
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [entries]);

  const goTo = useCallback((index: number) => {
    const root = scroller.current;
    if (!root) return;
    const clamped = Math.max(0, Math.min(index, root.children.length - 1));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (root.children[clamped] as HTMLElement | undefined)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, []);

  /** Écran réellement à l'écran (fiable même pendant un défilement en cours). */
  const currentIndex = useCallback(() => {
    const root = scroller.current;
    return root && root.clientHeight > 0 ? Math.round(root.scrollTop / root.clientHeight) : active;
  }, [active]);

  // Navigation au clavier : flèches, j/k, Page suivante/précédente.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "Escape") {
        setTopicsOpen(false);
        return;
      }
      if (["ArrowDown", "PageDown", "j"].includes(e.key)) {
        e.preventDefault();
        goTo(currentIndex() + 1);
      } else if (["ArrowUp", "PageUp", "k"].includes(e.key)) {
        e.preventDefault();
        goTo(currentIndex() - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, goTo]);

  function changeFilter(next: TopicSlug | "all") {
    setFilter(next);
    setTopicsOpen(false);
    setActive(0);
    setSeen(new Set([0]));
    scroller.current?.scrollTo({ top: 0 });
  }

  const filterLabel = filter === "all" ? "Pour vous" : (getTopic(filter)?.name ?? "Pour vous");

  return (
    <div ref={root} data-feed className="feed-h relative bg-night">
      {/* Barre du fil : marque (téléphone), mention démonstration, choix du sujet. Fond uni, sans flou. */}
      <div data-testid="feed-topbar" className="absolute inset-x-0 top-0 z-30 border-b border-ivory/10 bg-night">
        <div className="flex h-12 items-center justify-between gap-2 px-4 md:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-[0.2em] text-ivory md:invisible" aria-label="MUNDI, retour au début du fil">
            <LogoMark className="size-5" />
            <span className="max-[359px]:sr-only">MUNDI</span>
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <span className="md:hidden">
              <InstallChip compact />
            </span>
            {entry?.kind === "verified" || entry?.kind === "data" ? null : (
              <>
                {/* Libellé court sur téléphone pour que la barre tienne sur une ligne. */}
                <span className="sm:hidden">
                  <DemoBadge tone="light" label="Démo" />
                </span>
                <span className="hidden sm:inline-flex">
                  <DemoBadge tone="light" />
                </span>
              </>
            )}
            <button
              type="button"
              onClick={() => setTopicsOpen((o) => !o)}
              aria-expanded={topicsOpen}
              aria-controls="feed-topics"
              className="flex shrink-0 items-center gap-1.5 rounded-sm border border-ivory/30 px-2.5 py-1 text-[0.8rem] font-semibold text-ivory transition hover:border-ivory"
            >
              <span className="sr-only">Choisir un sujet : </span>
              <span className="max-w-[7rem] truncate max-[419px]:sr-only">{filterLabel}</span>
              <span className="min-[420px]:hidden" aria-hidden="true">Sujets</span>
              <Icon name="chevron-down" className={`size-3.5 transition-transform ${topicsOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
        {topicsOpen && (
          <div className="flex justify-end px-4 pb-3 md:px-8">
            <div id="feed-topics" role="group" aria-label="Filtrer le fil par sujet" className="w-full max-w-sm rounded-md border border-ivory/20 bg-night p-4">
              <p className="text-meta font-semibold text-ivory/70">Sujets du fil</p>
              <ul className="mt-2">
                <FilterChip label="Pour vous" active={filter === "all"} onClick={() => changeFilter("all")} />
                {feedTopics.map((t) => (
                  <FilterChip key={t.slug} label={t.name} active={filter === t.slug} onClick={() => changeFilter(t.slug)} />
                ))}
              </ul>
              <Link href="/mes-sujets/" className="mt-3 inline-flex text-[0.8rem] font-semibold text-brick-light underline-offset-2 hover:underline">
                Personnaliser mon fil
              </Link>
              {interests.length > 0 && <p className="mt-1 text-xs text-ivory/70">{interests.length} centre{interests.length > 1 ? "s" : ""} d’intérêt · des découvertes restent proposées</p>}
            </div>
          </div>
        )}
      </div>

      <div
        ref={scroller}
        aria-label="Fil de découverte"
        className="no-scrollbar h-full w-full touch-pan-y snap-y snap-mandatory overflow-y-scroll overscroll-y-contain"
      >
        {entries.map((e, i) =>
          e.kind === "verified" ? (
            <VerifiedCard key={e.key} publication={e.publication} index={i} position={e.position} total={publications.length} active={i === active} near={Math.abs(i - active) <= 1} revealed={seen.has(i)} visual={e.visual} />
          ) : e.kind === "data" ? (
            <article
              key={e.key}
              data-index={i}
              data-testid="data-card"
              data-publication={e.publication.slug}
              aria-roledescription="carte de données"
              aria-label={`${e.publication.title} : données, carte ${e.position + 1} sur ${e.total}`}
              className="relative h-full snap-start snap-always"
            >
              <DataCardView
                card={e.card}
                position={e.position}
                total={e.total}
                topicColor={getTopic(e.publication.topic)?.color ?? "#20B99A"}
                active={i === active}
                near={Math.abs(i - active) <= 1}
                revealed={seen.has(i)}
                status="verifie"
                href={e.position === e.total - 1 ? publicationPath(e.publication.slug) : undefined}
                backdrop={e.card.scene ? e.publication.backdrops?.[e.card.scene.backdrop] : undefined}
                photo={e.publication.photo}
              />
            </article>
          ) : e.kind === "divider" ? (
            <DemoDivider key={e.key} index={i} count={items.length} />
          ) : (
            <FeedCard key={e.key} slide={e.slide} index={i} total={items.length} active={i === active} near={Math.abs(i - active) <= 1} />
          ),
        )}
        <TransitionCard index={entries.length} count={verified.length} onRestart={() => goTo(0)} />
      </div>

      {/* Commandes discrètes (tablette et ordinateur), sur le bord droit. */}
      <div className="pointer-events-none absolute inset-y-0 right-3 z-20 hidden flex-col items-center justify-center gap-2 md:flex lg:right-6">
        <button
          type="button"
          onClick={() => goTo(currentIndex() - 1)}
          disabled={active === 0}
          className="pointer-events-auto flex size-10 items-center justify-center rounded-sm border border-ivory/30 bg-night text-ivory transition hover:border-ivory disabled:opacity-30"
          aria-label="Écran précédent"
        >
          <Icon name="chevron-up" className="size-5" />
        </button>
        <p className="pointer-events-auto min-w-10 text-center font-mono text-[0.7rem] text-ivory/75" aria-live="polite" data-testid="feed-counter">
          {atEnd ? (
            "Fin"
          ) : entry?.kind === "verified" ? (
            <>
              <span className="sr-only">Publications sourcées : </span>
              {entry.position + 1}/{publications.length}
            </>
          ) : entry?.kind === "data" ? (
            <>
              <span className="sr-only">Données, carte </span>
              {entry.position + 1}/{entry.total}
            </>
          ) : entry?.kind === "divider" ? (
            <span className="sr-only">Démonstrations</span>
          ) : (
            <>
              <span className="sr-only">{verified.length > 0 ? "Démonstrations : récit " : "Récit "}</span>
              {(current?.storyIndex ?? 0) + 1}/{items.length}
              {current && current.steps > 1 && <span className="sr-only">, écran {current.step + 1} sur {current.steps}</span>}
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => goTo(currentIndex() + 1)}
          disabled={active >= entries.length}
          className="pointer-events-auto flex size-10 items-center justify-center rounded-sm border border-ivory/30 bg-night text-ivory transition hover:border-ivory disabled:opacity-30"
          aria-label="Écran suivant"
        >
          <Icon name="chevron-down" className="size-5" />
        </button>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <li className="border-b border-ivory/10 last:border-b-0">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`w-full py-2 text-left text-sm transition-colors ${active ? "font-semibold text-brick-light" : "text-ivory/85 hover:text-ivory"}`}
      >
        {label}
      </button>
    </li>
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
      className="relative flex h-full snap-start snap-always flex-col overflow-hidden bg-night pt-12 text-ivory"
    >
      <MediaStage story={story} active={active} near={near} />

      {/* Sur très petit écran, le texte défile dans la carte plutôt que d'être coupé. */}
      <div data-testid="card-scroll" className="no-scrollbar relative flex min-h-0 shrink flex-col overflow-y-auto wide:flex-1">
        <div className="feed-column relative px-5 pt-4 pb-2 wide:my-auto wide:py-8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-meta text-ivory/70">
              <span className="font-semibold text-brick-light">{topic.name}</span> · {format.name} · <span className="font-mono">{formatMinutes(story.minutes)}</span> ·{" "}
              <span className="font-semibold text-[#ffd98f]">Contenu illustratif</span>
            </p>
            <div className="-mr-2 flex shrink-0 items-center">
              <SaveButton slug={story.slug} title={story.title} variant="rail" />
              <ShareButton slug={story.slug} title={story.title} variant="rail" />
            </div>
          </div>

          {beat ? <NarrativeBody slide={slide} /> : <SummaryBody story={story} />}

          {beat && (
            <div className="mt-4 flex gap-1" aria-hidden="true" data-testid="narrative-progress">
              {Array.from({ length: steps }, (_, i) => (
                <span key={i} className={`h-0.5 flex-1 ${i <= step ? "bg-ivory" : "bg-ivory/20"}`} />
              ))}
            </div>
          )}
          {!last && <p className="mt-3 text-xs font-medium text-ivory/70 [@media(max-height:680px)]:mt-2">Faites défiler pour la suite</p>}
        </div>
      </div>

      {/* Barre d'actions hors de la zone qui défile : toujours visible, quelle que soit la hauteur d'écran. */}
      {last && (
        <div className="feed-column relative flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-2 pb-4" data-testid="card-actions">
          <Link href={`/recit/${story.slug}/`} aria-label={`Comprendre : ${story.title}`} className="btn btn-light">
            Comprendre
          </Link>
          <ListenButton title={story.title} summary={story.dek} points={story.keyPoints} active={active} />
        </div>
      )}
    </article>
  );
}

/** Carte classique : titre, chapeau et trois points clés. */
function SummaryBody({ story }: { story: Story }) {
  return (
    <>
      <h2 className="mt-1 font-display text-[1.6rem] leading-[1.1] font-semibold text-balance md:text-[2.2rem] lg:text-[2.6rem] [@media(max-height:680px)]:text-[1.3rem] max-[359px]:text-[1.25rem]">{story.title}</h2>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-ivory/80 [@media(max-height:700px)]:hidden">{story.dek}</p>
      <ol className="mt-3 border-t border-ivory/15">
        {story.keyPoints.map((point, i) => (
          <li key={i} className="flex gap-3 border-b border-ivory/15 py-1.5 text-[0.85rem] leading-snug text-ivory/90">
            <span className="font-mono text-[0.75rem] text-brick-light">{String(i + 1).padStart(2, "0")}</span>
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
    <div>
      {step === 0 ? (
        <h2 className="mt-1 text-sm font-semibold text-ivory/75">{story.title}</h2>
      ) : (
        <p className="mt-1 text-sm font-semibold text-ivory/75">{story.title}</p>
      )}
      <p className="mt-2 text-meta font-semibold text-brick-light">{beat.label}</p>
      <p className="mt-1 font-display text-[1.6rem] leading-[1.15] font-semibold text-balance md:text-[2.1rem] lg:text-[2.4rem] [@media(max-height:680px)]:text-[1.3rem] max-[359px]:text-[1.25rem]">{beat.text}</p>
    </div>
  );
}

/**
 * Dernier écran du fil : sépare clairement les récits illustratifs des
 * publications de la rédaction. N'affiche aucune information non revue.
 */
function TransitionCard({ index, count, onRestart }: { index: number; count: number; onRestart: () => void }) {
  return (
    <article
      data-index={index}
      data-testid="feed-transition"
      aria-label="Fin des récits illustratifs"
      className="relative flex h-full snap-start snap-always flex-col justify-end overflow-hidden bg-night pt-16 pb-10 text-ivory md:justify-center md:pb-16"
    >
      <div className="feed-column relative px-6">
        <p className="text-meta font-semibold text-[#ffd98f]">Fin des récits illustratifs</p>
        {count === 0 ? (
          <>
            <h2 className="mt-2 font-display text-[2rem] leading-[1.1] font-semibold text-balance">Bientôt : les publications sourcées de la rédaction</h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ivory/80">
              Ce que vous venez de parcourir sert à tester MUNDI. Les prochains récits s&apos;appuieront sur des sources réelles,
              vérifiées et relues par une personne avant publication.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-2 font-display text-[2rem] leading-[1.1] font-semibold text-balance">Vous avez parcouru tout le fil</h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ivory/80">
              Les publications sourcées ouvrent le fil. Les récits qui suivent sont des démonstrations : ils servent à tester
              MUNDI et ne relatent aucune actualité.
            </p>
          </>
        )}
        <dl className="mt-6 grid grid-cols-2 gap-x-6 border-t border-ivory/20 text-sm">
          <div className="border-b border-ivory/20 py-3">
            <dt className="text-meta font-semibold text-[#ffd98f]">Démonstration</dt>
            <dd className="mt-1 text-ivory/80">Exemple pédagogique, sources fictives.</dd>
          </div>
          <div className="border-b border-ivory/20 py-3">
            <dt className="text-meta font-semibold text-ivory">Publication</dt>
            <dd className="mt-1 text-ivory/80">Sources réelles et datées, contrôle indiqué sur chaque article.</dd>
          </div>
        </dl>
        <p className="mt-5 text-sm font-medium text-ivory/90" data-testid="verified-count">
          {count === 0
            ? "Aucune publication sourcée pour l'instant."
            : `${count} publication${count > 1 ? "s" : ""} sourcée${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""}.`}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/actualites/" className="btn btn-light">Publications sourcées</Link>
          <button type="button" onClick={onRestart} className="btn btn-outline-light">
            Revoir depuis le début
          </button>
        </div>
      </div>
    </article>
  );
}

/** Séparation nette entre les publications sourcées et les démonstrations. */
function DemoDivider({ index, count }: { index: number; count: number }) {
  return (
    <section
      data-index={index}
      data-testid="demo-divider"
      aria-label="Début des récits de démonstration"
      className="relative flex h-full snap-start snap-always flex-col justify-end overflow-hidden bg-night pt-16 pb-12 text-ivory md:justify-center md:pb-16"
    >
      <div className="feed-column relative px-6">
        <DemoBadge tone="light" />
        <h2 className="mt-2 font-display text-[2rem] leading-[1.1] font-semibold text-balance">La suite est illustrative</h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-ivory/80">
          Vous avez vu toutes les publications sourcées. Les {count} récit{count > 1 ? "s" : ""} suivant{count > 1 ? "s" : ""} sont des
          exemples pédagogiques : leurs sources et leurs dates sont fictives.
        </p>
        <p className="mt-5 text-xs font-medium text-ivory/70">Faites défiler pour continuer</p>
      </div>
    </section>
  );
}
