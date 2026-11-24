"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { publicationKind, type PublicationKind } from "@/lib/publication-kind";
import { searchPublications } from "@/lib/search";
import { getTopic, topics } from "@/lib/topics";
import type { TopicSlug } from "@/lib/types";
import type { FeedPublication } from "@/lib/verified";
import { Icon } from "./Icon";
import { consumeSearchFocus } from "./SearchShortcut";
import { PublicationTile } from "./PublicationTile";

const plural = (n: number, one: string, many = one + "s") => (n > 1 ? many : one);

/** Deux espaces séparés : les actualités (journalistes) et les concepts (professeurs). */
const GENRES: { kind: PublicationKind; param: string; name: string; hint: string; heading: string }[] = [
  { kind: "actualite", param: "actualites", name: "Actualités", hint: "Ce qui vient de se passer", heading: "Les dernières actualités" },
  { kind: "concept", param: "concepts", name: "Concepts", hint: "Les notions pour comprendre", heading: "Les concepts à connaître" },
];
const genreOf = (param: string | null) => GENRES.find((g) => g.param === param) ?? GENRES[0];

export function ExploreClient({ publications }: { publications: FeedPublication[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [topic, setTopic] = useState<TopicSlug | null>(getTopic(params.get("sujet") ?? "")?.slug ?? null);
  const [genre, setGenre] = useState(() => genreOf(params.get("genre")));
  const input = useRef<HTMLInputElement>(null);

  // Adresse partageable (recherche, espace, rubrique), sans naviguer à chaque frappe.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams();
      if (query.trim()) next.set("q", query.trim());
      if (genre !== GENRES[0]) next.set("genre", genre.param);
      if (topic) next.set("sujet", topic);
      const href = next.size ? "/explorer/?" + next.toString() : "/explorer/";
      const current = params.size ? "/explorer/?" + params.toString() : "/explorer/";
      if (href !== current) router.replace(href, { scroll: false });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, topic, genre, params, router]);

  /** Résultats de la recherche, par espace (avant le filtre de rubrique). */
  const found = useMemo(() => {
    const all = searchPublications(publications, query);
    return Object.fromEntries(GENRES.map((g) => [g.kind, all.filter((p) => publicationKind(p) === g.kind)])) as Record<PublicationKind, FeedPublication[]>;
  }, [publications, query]);
  const inGenre = found[genre.kind];
  const results = useMemo(() => (topic ? inGenre.filter((p) => p.topic === topic) : inGenre), [inGenre, topic]);
  /** Rubriques présentes dans l'espace choisi, pour ne jamais proposer un filtre vide. */
  const genreTopics = useMemo(() => {
    const inThisGenre = publications.filter((p) => publicationKind(p) === genre.kind);
    return topics
      .map((t) => ({ topic: t, count: inThisGenre.filter((p) => p.topic === t.slug).length }))
      .filter((t) => t.count > 0 || t.topic.slug === topic);
  }, [publications, genre, topic]);

  const searching = query.trim().length > 0;
  const total = found.actualite.length + found.concept.length;
  const selectedTopic = topic ? getTopic(topic) : null;
  const [lead, ...others] = results;
  useEffect(() => {
    if (consumeSearchFocus()) input.current?.focus();
  }, []);
  function clearFilters() { setQuery(""); setTopic(null); }

  return (
    <div className="mt-8">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
        <label htmlFor="search" className="sr-only">Rechercher une actualité ou un concept</label>
        <Icon name="search" className="pointer-events-none absolute left-0 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <input id="search" ref={input} type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Matières critiques, inflation, énergie…" autoComplete="off" aria-keyshortcuts="/ Control+K Meta+K"
          className="h-14 w-full border-0 border-b-2 border-ink bg-transparent pl-8 pr-12 font-display text-xl text-ink placeholder:text-muted focus:border-accent focus:outline-none" />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche"
            className="absolute right-0 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-sm text-muted hover:text-ink">
            <Icon name="close" className="size-4" />
          </button>
        )}
      </form>
      <p className="mt-2 text-meta text-muted" aria-live="polite">
        <span className="font-mono">{total}</span> {searching ? plural(total, "résultat") : plural(total, "contenu")} ·{" "}
        <span className="font-mono">{found.actualite.length}</span> {plural(found.actualite.length, "actualité")} ·{" "}
        <span className="font-mono">{found.concept.length}</span> {plural(found.concept.length, "concept")}
      </p>

      {/* Les deux espaces : actualités d'un côté, concepts de l'autre. */}
      <div role="group" aria-label="Choisir un espace" className="mt-8 grid grid-cols-2 border-b border-ink" data-testid="explore-genres">
        {GENRES.map((g) => {
          const selected = g === genre;
          return (
            <button key={g.kind} type="button" aria-pressed={selected} onClick={() => { setGenre(g); setTopic(null); }}
              data-testid={`genre-${g.param}`}
              className={"-mb-px border-b-[3px] pb-3 pt-1 text-left transition-colors " + (selected ? "border-accent" : "border-transparent hover:border-rule")}>
              <span className={"flex items-baseline gap-2 font-display text-xl font-semibold leading-tight md:text-2xl " + (selected ? "text-ink" : "text-muted")}>
                {g.name}
                <span className="font-mono text-meta font-normal text-muted">{found[g.kind].length}</span>
              </span>
              <span className="mt-0.5 block text-sm leading-snug text-muted">{g.hint}</span>
            </button>
          );
        })}
      </div>

      {/* Rubriques de l'espace choisi, sur une ligne qui défile horizontalement. */}
      <div role="group" aria-label="Filtrer par rubrique" className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0" data-testid="explore-topics">
        <button type="button" aria-pressed={!topic} onClick={() => setTopic(null)} className={chip(!topic)}>Toutes</button>
        {genreTopics.map(({ topic: t, count }) => (
          <button key={t.slug} type="button" aria-pressed={topic === t.slug} onClick={() => setTopic(topic === t.slug ? null : t.slug)} className={chip(topic === t.slug)}>
            {t.name} <span className="font-mono text-[0.8em] opacity-70">{count}</span>
          </button>
        ))}
      </div>

      <section aria-labelledby="publications" className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2">
          <h2 id="publications" className="font-display text-intertitre font-semibold text-ink">
            {searching ? `${genre.name} correspondant à votre recherche` : selectedTopic ? `${genre.name} · ${selectedTopic.name}` : genre.heading}
          </h2>
          <span className="font-mono text-meta text-muted">{results.length} {plural(results.length, "article")}</span>
        </div>
        {lead ? (
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-0">
            <div className="lg:border-r lg:border-rule lg:pr-8">
              <PublicationTile publication={lead} featured />
            </div>
            {others.length > 0 && (
              <div className="border-t border-rule lg:border-t-0 lg:pl-8">
                {others.map((p) => <PublicationTile key={p.slug} publication={p} />)}
              </div>
            )}
          </div>
        ) : total === 0 ? (
          <div role="status" className="mt-6">
            <p className="font-display text-xl font-semibold text-ink">Aucun résultat trouvé</p>
            <p className="mt-1 text-sm text-muted">Essayez une autre recherche ou une autre rubrique.</p>
            <button type="button" onClick={clearFilters} className="btn btn-secondary mt-4">Tout afficher</button>
          </div>
        ) : (
          <p className="mt-5 text-sm leading-relaxed text-muted">
            Rien dans les {genre.name.toLowerCase()} pour ces filtres.{" "}
            {GENRES.filter((g) => g !== genre && found[g.kind].length > 0).map((g) => (
              <button key={g.kind} type="button" onClick={() => setGenre(g)} className="font-semibold text-accent underline-offset-4 hover:underline">
                Voir les {found[g.kind].length} {g.name.toLowerCase()}
              </button>
            ))}
          </p>
        )}
      </section>
    </div>
  );
}

function chip(selected: boolean) {
  return "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors " +
    (selected ? "border-ink bg-ink text-on-ink" : "border-rule text-ink hover:border-ink");
}
