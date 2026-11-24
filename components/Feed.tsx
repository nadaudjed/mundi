"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { personalized, useInterests } from "@/lib/preferences";
import { getTopic, topics } from "@/lib/topics";
import type { TopicSlug } from "@/lib/types";
import type { FeedPublication } from "@/lib/verified";
import { InstallChip } from "./InstallButton";
import { Icon } from "./Icon";
import { LogoMark } from "./Logo";
import { VerifiedCard, type CardVisual } from "./VerifiedCard";
import { DataCardView } from "./data-cards/DataCardView";
import type { DataCard } from "@/lib/data-cards";
import { publicationPath } from "@/lib/publication-links";

/**
 * Entrées du fil : uniquement les publications sourcées, chacune suivie
 * de ses éventuelles cartes de données. Aucun contenu de démonstration.
 */
type Entry =
  | { kind: "verified"; key: string; publication: FeedPublication; position: number; visual: CardVisual }
  | { kind: "data"; key: string; publication: FeedPublication; card: DataCard; position: number; total: number };

type Props = {
  /** Publications vérifiées, fournies au moment de la construction (jamais de brouillon). */
  verified?: FeedPublication[];
};

/** Position dans le Fil pour le retour arrière (sessionStorage, effacée à la fermeture de l'onglet). */
const FEED_POSITION_KEY = "mundi:feed-position";

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

  // « Pour vous » : vos sujets d'abord, en gardant des découvertes (voir Mes sujets).
  const publications = useMemo(
    () => (filter === "all" ? personalized(verified, interests) : verified.filter((p) => p.topic === filter)),
    [filter, verified, interests],
  );
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
    return list;
  }, [publications]);
  /** Sujets réellement présents dans le fil, pour ne pas proposer de filtre vide. */
  const feedTopics = useMemo(() => topics.filter((t) => verified.some((p) => p.topic === t.slug)), [verified]);
  const entry = active < entries.length ? entries[active] : undefined;
  const atEnd = active >= entries.length;

  // Retour arrière : le Fil revient sur l'écran où l'on était (mémorisé pour cet onglet seulement).
  const pendingKey = useRef<string | null>(null);
  const restored = useRef(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(FEED_POSITION_KEY) ?? "null") as { filter?: string; key?: string } | null;
      if (saved?.key) {
        pendingKey.current = saved.key;
        if (saved.filter && saved.filter !== "all") requestAnimationFrame(() => setFilter(saved.filter as TopicSlug));
      }
    } catch {
      /* stockage indisponible : on repart du début */
    }
    restored.current = true;
  }, []);
  useEffect(() => {
    const key = pendingKey.current;
    const el = scroller.current;
    if (!key || !el) return;
    const index = entries.findIndex((e) => e.key === key);
    if (index < 0) return;
    pendingKey.current = null;
    el.scrollTo({ top: index * el.clientHeight, behavior: "instant" as ScrollBehavior });
    setActive(index);
    setSeen((prev) => new Set(prev).add(index));
  }, [entries]);
  useEffect(() => {
    if (!restored.current || pendingKey.current) return;
    const key = entries[active]?.key;
    try {
      if (key) sessionStorage.setItem(FEED_POSITION_KEY, JSON.stringify({ filter, key }));
    } catch {
      /* rien à faire */
    }
  }, [active, entries, filter]);

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
      {/* Barre du fil : marque (téléphone), choix du sujet. Fond uni, sans flou. */}
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
            <VerifiedCard key={e.key} publication={e.publication} index={i} position={e.position} total={publications.length} active={i === active} near={Math.abs(i - active) <= 2} revealed={seen.has(i)} visual={e.visual} />
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
                near={Math.abs(i - active) <= 2}
                revealed={seen.has(i)}
                status="verifie"
                href={e.position === e.total - 1 ? publicationPath(e.publication.slug) : undefined}
                backdrop={e.card.scene ? e.publication.backdrops?.[e.card.scene.backdrop] : undefined}
                photo={e.publication.photo}
              />
            </article>
          ) : null,
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
          ) : null}
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

/** Fin du fil : nombre de publications et accès à la liste complète. */
function TransitionCard({ index, count, onRestart }: { index: number; count: number; onRestart: () => void }) {
  return (
    <article
      data-index={index}
      data-testid="feed-transition"
      aria-label="Fin du fil"
      className="relative flex h-full snap-start snap-always flex-col justify-end overflow-hidden bg-night pt-16 pb-10 text-ivory md:justify-center md:pb-16"
    >
      <div className="feed-column relative px-6">
        <p className="text-meta font-semibold text-brick-light">Fin du fil</p>
        <h2 className="mt-2 font-display text-[2rem] leading-[1.1] font-semibold text-balance">
          {count === 0 ? "Les premières publications arrivent bientôt" : "Vous êtes à jour"}
        </h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-ivory/80">
          Chaque jour, la rédaction publie des actualités et des concepts sourcés. Explorer les range dans deux espaces séparés.
        </p>
        <p className="mt-5 text-sm font-medium text-ivory/90" data-testid="verified-count">
          {count === 0
            ? "Aucune publication sourcée pour l'instant."
            : `${count} publication${count > 1 ? "s" : ""} sourcée${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""}.`}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/explorer/" className="btn btn-light">Explorer</Link>
          <button type="button" onClick={onRestart} className="btn btn-outline-light">
            Revoir depuis le début
          </button>
        </div>
      </div>
    </article>
  );
}
