"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { mixFeed, newFeedSeed } from "@/lib/feed-mix";
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
import { TodayCard } from "./pilot/TodayCard";
import type { TodayState } from "@/lib/today";

/** Édition « Aujourd'hui » calculée au build (lib/today.ts) : trois sujets au plus. */
export type TodayEdition = { edition: string; state?: TodayState; today?: string; picks: { slug: string; fallback: boolean }[] };

/**
 * Entrées du fil : uniquement les publications sourcées, chacune suivie
 * de ses éventuelles cartes de données. Aucun contenu de démonstration.
 */
type Entry =
  | { kind: "today"; key: string; publication: FeedPublication; rank: number; fallback: boolean }
  | { kind: "verified"; key: string; publication: FeedPublication; position: number; visual: CardVisual }
  | { kind: "data"; key: string; publication: FeedPublication; card: DataCard; position: number; total: number };

type Props = {
  /** Publications vérifiées, fournies au moment de la construction (jamais de brouillon). */
  verified?: FeedPublication[];
  /** Mélange partiel de l'ordre à chaque visite (désactivé sur le site de test). */
  mix?: boolean;
  /** Sujets du jour, en tête du fil « Pour vous » (le fil complet suit, sans doublon). */
  today?: TodayEdition;
};

/** Position dans le Fil pour le retour arrière (sessionStorage, effacée à la fermeture de l'onglet). */
const FEED_POSITION_KEY = "mundi:feed-position";
/** Tirage du mélange pour cet onglet : le même ordre tant que l'onglet reste ouvert. */
const FEED_SEED_KEY = "mundi:feed-seed";

/** Lit (ou crée) le tirage de cet onglet ; 0 si le mélange est désactivé. */
function readSeed(mix: boolean): number {
  if (!mix) return 0;
  try {
    const saved = Number(sessionStorage.getItem(FEED_SEED_KEY));
    if (Number.isInteger(saved) && saved > 0) return saved;
    const seed = newFeedSeed();
    sessionStorage.setItem(FEED_SEED_KEY, String(seed));
    return seed;
  } catch {
    return newFeedSeed();
  }
}

export function Feed({ verified = [], mix = true, today }: Props) {
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
  /** Tirage du mélange, connu seulement dans le navigateur (null avant : ordre éditorial). */
  const [seed, setSeed] = useState<number | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSeed(readSeed(mix)));
    return () => cancelAnimationFrame(frame);
  }, [mix]);
  /** Cartes dont on charge la photo : la carte visible et ses voisines. Tant que l'ordre
      mélangé n'est pas connu, seule la première (qui reste en tête) : sinon les photos
      des voisines de l'ordre éditorial seraient téléchargées pour rien. */
  const isNear = (i: number) => (seed === null ? i === 0 : Math.abs(i - active) <= 2);

  // « Pour vous » : ordre un peu mélangé à chaque visite, vos sujets d'abord,
  // en gardant des découvertes (voir Mes sujets).
  const todayEntries = useMemo<Entry[]>(() => {
    if (filter !== "all" || !today) return [];
    const bySlug = new Map(verified.map((p) => [p.slug, p]));
    return today.picks.flatMap((pick, rank): Entry[] => {
      const publication = bySlug.get(pick.slug);
      return publication ? [{ kind: "today", key: `today:${pick.slug}`, publication, rank, fallback: pick.fallback }] : [];
    });
  }, [filter, today, verified]);
  const todaySlugs = useMemo(() => new Set(todayEntries.map((e) => e.publication.slug)), [todayEntries]);
  // Le mélange porte sur ce qui reste après la tête « Aujourd'hui » : retirer ces sujets
  // après coup pouvait recoller deux publications du même sujet.
  const mixed = useMemo(() => {
    const base = filter === "all" ? verified.filter((p) => !todaySlugs.has(p.slug)) : verified;
    return seed ? mixFeed(base, seed) : base;
  }, [verified, seed, filter, todaySlugs]);
  const publications = useMemo(
    () => (filter === "all" ? personalized(mixed, interests) : mixed.filter((p) => p.topic === filter)),
    [filter, mixed, interests],
  );
  const entries = useMemo<Entry[]>(() => {
    // Chaque publication approuvée peut être suivie de sa séquence de cartes de données.
    const list: Entry[] = publications.flatMap((publication, position): Entry[] => [
      { kind: "verified", key: `pub:${publication.slug}`, publication, position, visual: position % 2 === 0 ? "motif" : "sobre" },
      // Tous les articles ne sont pas « en cartes » : dataCardsInFeed false garde un simple article.
      ...(publication.dataCardsInFeed === false ? [] : (publication.dataCards ?? [])).map((card, i, all): Entry => ({
        kind: "data",
        key: `pub:${publication.slug}:${card.id}`,
        publication,
        card,
        position: i,
        total: all.length,
      })),
    ]);
    return [...todayEntries, ...list];
  }, [publications, todayEntries]);
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
    // Attendre l'ordre mélangé de cet onglet avant de revenir sur l'écran mémorisé.
    if (!key || !el || seed === null) return;
    const index = entries.findIndex((e) => e.key === key);
    if (index < 0) return;
    pendingKey.current = null;
    el.scrollTo({ top: index * el.clientHeight, behavior: "instant" as ScrollBehavior });
    setActive(index);
    setSeen((prev) => new Set(prev).add(index));
  }, [entries, seed]);
  useEffect(() => {
    if (!restored.current || pendingKey.current || seed === null) return;
    const key = entries[active]?.key;
    try {
      if (key) sessionStorage.setItem(FEED_POSITION_KEY, JSON.stringify({ filter, key }));
    } catch {
      /* rien à faire */
    }
  }, [active, entries, filter, seed]);

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

  // Tirer vers le bas en haut du Fil : vérifier s'il y a de nouveaux articles.
  const { pull, status: refresh, showFresh } = usePullToRefresh(scroller, verified, topicsOpen);

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

  /** Annonce discrète pour les lecteurs d'écran (retour au début du fil). */
  const [announce, setAnnounce] = useState("");
  /**
   * « Début du fil » : saut direct à la première carte du flux en cours (même filtre,
   * même ordre), sans défiler à travers toutes les cartes. Le focus passe sur la
   * première carte pour que le clavier et les lecteurs d'écran repartent de là.
   */
  const backToStart = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    setActive(0);
    setSeen((prev) => new Set(prev).add(0));
    const first = el.children[0] as HTMLElement | undefined;
    if (first) {
      first.setAttribute("tabindex", "-1");
      first.focus({ preventScroll: true });
      first.setAttribute("data-landed", "");
      window.setTimeout(() => first.removeAttribute("data-landed"), 600);
    }
    setAnnounce("");
    requestAnimationFrame(() => setAnnounce("Retour au début du fil"));
  }, []);
  /** Le bouton apparaît une fois deux écrans dépassés. */
  const showBackToStart = active >= 2;

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
          <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-[0.2em] text-ivory md:invisible" aria-label="MUNDI, retour à l’accueil">
            <LogoMark className="size-5" />
            <span className="max-[359px]:sr-only">MUNDI</span>
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            {showBackToStart ? (
              <button
                type="button"
                onClick={backToStart}
                data-testid="feed-back-to-start"
                className="feed-pop flex shrink-0 items-center gap-1 rounded-sm border border-ivory/30 px-2.5 py-1 text-[0.8rem] font-semibold text-ivory transition hover:border-ivory"
              >
                <Icon name="chevron-up" className="size-3.5" />
                Début du fil
              </button>
            ) : (
              <span className="md:hidden">
                <InstallChip compact />
              </span>
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
          e.kind === "today" ? (
            <TodayCard key={e.key} publication={e.publication} index={i} rank={e.rank} size={todayEntries.length} edition={today?.edition ?? ""} state={today?.state} builtFor={today?.today} active={i === active} near={isNear(i)} fallback={e.fallback} onSkip={() => goTo(todayEntries.length)} />
          ) : e.kind === "verified" ? (
            <VerifiedCard key={e.key} publication={e.publication} index={i} position={e.position} total={publications.length} active={i === active} near={isNear(i)} revealed={seen.has(i)} visual={e.visual} />
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
                near={isNear(i)}
                revealed={seen.has(i)}
                status="verifie"
                href={e.position === e.total - 1 ? publicationPath(e.publication.slug) : undefined}
                backdrop={e.card.scene ? e.publication.backdrops?.[e.card.scene.backdrop] : undefined}
                photo={e.publication.cardPhotos?.[e.card.id]}
              />
            </article>
          ) : null,
        )}
        <TransitionCard index={entries.length} count={verified.length} onRestart={() => goTo(0)} />
      </div>

      <p className="sr-only" aria-live="polite" data-testid="feed-announce">{announce}</p>

      <RefreshIndicator pull={pull} status={refresh} onShow={showFresh} />

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
          ) : entry?.kind === "today" ? (
            <>
              <span className="sr-only">Aujourd&apos;hui, sujet </span>
              {entry.rank + 1}/{todayEntries.length}
            </>
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
          Chaque jour, la rédaction publie des actualités, des récits et des concepts sourcés. Explorer permet de les chercher et de les filtrer par format.
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

/** Distance (px, après amortissement) à partir de laquelle relâcher lance la vérification. */
const PULL_THRESHOLD = 64;

type RefreshStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "uptodate" }
  | { state: "offline" }
  | { state: "fresh"; count: number };

/**
 * « Tirer pour actualiser » : en haut du Fil, tirer vers le bas puis relâcher relit
 * /fil.json (liste des articles en ligne, sans cache). S'il y a de nouveaux articles,
 * le Fil se recharge et repart du début. La même vérification a lieu, sans bruit,
 * quand on revient sur l'onglet : un bouton « N nouveaux articles » apparaît alors.
 */
function usePullToRefresh(scroller: RefObject<HTMLDivElement | null>, verified: FeedPublication[], paused: boolean) {
  const [pull, setPull] = useState(0);
  const [status, setStatus] = useState<RefreshStatus>({ state: "idle" });
  const known = useMemo(() => new Set(verified.map((p) => p.slug)), [verified]);
  const pullRef = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  const showFresh = useCallback(() => {
    try {
      sessionStorage.removeItem(FEED_POSITION_KEY);
    } catch {
      /* rien à faire */
    }
    window.location.reload();
  }, []);

  const check = useCallback(
    async (manual: boolean) => {
      window.clearTimeout(timer.current);
      if (manual) setStatus({ state: "checking" });
      try {
        const res = await fetch("/fil.json", { cache: "no-store" });
        const { slugs } = (await res.json()) as { slugs: string[] };
        const count = slugs.filter((s) => !known.has(s)).length;
        if (count > 0) {
          setStatus({ state: "fresh", count });
          // Geste volontaire : on affiche tout de suite les nouveaux articles.
          if (manual) timer.current = window.setTimeout(showFresh, 700);
          return;
        }
        if (!manual) return;
        setStatus({ state: "uptodate" });
      } catch {
        if (!manual) return;
        setStatus({ state: "offline" });
      }
      timer.current = window.setTimeout(() => setStatus({ state: "idle" }), 2200);
    },
    [known, showFresh],
  );

  // Les écouteurs tactiles restent les mêmes pendant tout le geste : ils lisent la
  // dernière version de check/paused via des références (sinon un nouveau rendu en
  // plein geste les remplacerait et le relâchement serait ignoré).
  const checkRef = useRef(check);
  const pausedRef = useRef(paused);
  useEffect(() => {
    checkRef.current = check;
    pausedRef.current = paused;
  }, [check, paused]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let startY: number | null = null;
    const set = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };
    const onStart = (e: TouchEvent) => {
      startY = !pausedRef.current && el.scrollTop <= 0 ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (startY === null) return;
      const d = e.touches[0].clientY - startY;
      if (d <= 0 || el.scrollTop > 0) return set(0);
      set(Math.min(110, d * 0.5));
    };
    const onEnd = () => {
      if (startY === null) return;
      startY = null;
      const reached = pullRef.current >= PULL_THRESHOLD;
      set(0);
      if (reached) void checkRef.current(true);
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [scroller]);

  // Retour sur l'onglet : indépendant du conteneur du Fil, pour être actif dès l'affichage.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void check(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [check]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { pull, status, showFresh, check };
}

function RefreshIndicator({ pull, status, onShow }: { pull: number; status: RefreshStatus; onShow: () => void }) {
  const pulling = pull > 0;
  const label = pulling
    ? pull >= PULL_THRESHOLD ? "Relâchez pour actualiser" : "Tirez pour voir les derniers articles"
    : status.state === "checking" ? "Recherche des derniers articles…"
    : status.state === "uptodate" ? "Vous êtes à jour"
    : status.state === "offline" ? "Pas de connexion : réessayez plus tard"
    : null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-12 z-20 flex justify-center px-4" aria-live="polite" data-testid="feed-refresh">
      {status.state === "fresh" && !pulling ? (
        <button type="button" onClick={onShow} className="pointer-events-auto mt-3 rounded-full bg-ivory px-4 py-2 text-sm font-semibold text-night shadow-lg" data-testid="feed-refresh-fresh">
          {status.count > 1 ? `${status.count} nouveaux articles` : "1 nouvel article"} · Afficher
        </button>
      ) : label ? (
        <p
          className="mt-3 flex items-center gap-2 rounded-full border border-ivory/20 bg-night px-4 py-2 text-[0.8rem] font-semibold text-ivory"
          style={pulling ? { transform: `translateY(${pull - 24}px)`, opacity: Math.min(1, pull / PULL_THRESHOLD) } : undefined}
        >
          <Icon name="chevron-down" className={`size-3.5 transition-transform ${pull >= PULL_THRESHOLD ? "rotate-180" : ""} ${status.state === "checking" ? "animate-spin" : ""}`} />
          {label}
        </p>
      ) : null}
    </div>
  );
}
