"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { publicationKind, type PublicationKind } from "@/lib/publication-kind";
import type { DossierIndexItem } from "@/lib/dossiers";
import { searchDossiers, searchPublications } from "@/lib/search";
import { getTopic, topics } from "@/lib/topics";
import type { TopicSlug } from "@/lib/types";
import type { FeedPublication } from "@/lib/verified";
import { Icon } from "./Icon";
import { consumeSearchFocus } from "./SearchShortcut";
import { PublicationTile } from "./PublicationTile";
import { DossierTile } from "./dossier/DossierTile";

const plural = (n: number, one: string, many = one + "s") => (n > 1 ? many : one);

/**
 * Formats (refonte #113) : « Tous » par défaut, puis des filtres explicites.
 * Les anciennes adresses (?genre=actualites…) restent valables ; ?genre=dossiers s'ajoute.
 * Les dossiers ne sont pas des publications : ils ont leur propre carte et leur propre index léger.
 */
type Genre = { kind: PublicationKind | "tous" | "dossier"; param: string; name: string; hint: string; heading: string };
const GENRES: Genre[] = [
  { kind: "tous", param: "tous", name: "Tous", hint: "Tous les formats", heading: "Toutes les publications" },
  { kind: "actualite", param: "actualites", name: "Actualités", hint: "Ce qui vient de se passer", heading: "Les dernières actualités" },
  { kind: "recit", param: "recits", name: "Récits", hint: "Histoires vraies, épisodes, idées", heading: "Les récits" },
  { kind: "concept", param: "concepts", name: "Concepts", hint: "Les notions pour comprendre", heading: "Les concepts à connaître" },
  { kind: "dossier", param: "dossiers", name: "Dossiers", hint: "Un sujet suivi dans la durée", heading: "Les dossiers" },
];
const DOSSIERS = GENRES[4];
const ALL = GENRES[0];
const genreOf = (param: string | null) => GENRES.find((g) => g.param === param) ?? GENRES[0];

export function ExploreClient({ publications, dossiers = [] }: { publications: FeedPublication[]; dossiers?: DossierIndexItem[] }) {
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
    return Object.fromEntries(GENRES.filter((g) => g !== DOSSIERS).map((g) => [g.kind, g === ALL ? all : all.filter((p) => publicationKind(p) === g.kind)])) as Record<Genre["kind"], FeedPublication[]>;
  }, [publications, query]);
  const foundDossiers = useMemo(() => searchDossiers(dossiers, query), [dossiers, query]);
  /** Nombre de contenus trouvés par format : « Tous » compte aussi les dossiers. */
  const countOf = (g: Genre) => (g === DOSSIERS ? foundDossiers.length : g === ALL ? found.tous.length + foundDossiers.length : found[g.kind].length);
  const results = useMemo(() => {
    const inGenre = genre === DOSSIERS ? [] : found[genre.kind];
    return topic ? inGenre.filter((p) => p.topic === topic) : inGenre;
  }, [found, genre, topic]);
  /** Dossiers affichés : dans « Tous » et « Dossiers », jamais dans les autres formats. */
  const dossierResults = useMemo(() => {
    if (genre !== ALL && genre !== DOSSIERS) return [];
    return topic ? foundDossiers.filter((d) => d.topic === topic) : foundDossiers;
  }, [foundDossiers, genre, topic]);
  /** Rubriques présentes dans l'espace choisi, pour ne jamais proposer un filtre vide. */
  const genreTopics = useMemo(() => {
    const inThisGenre: { topic: string }[] = genre === ALL ? [...publications, ...dossiers] : genre === DOSSIERS ? dossiers : publications.filter((p) => publicationKind(p) === genre.kind);
    return topics
      .map((t) => ({ topic: t, count: inThisGenre.filter((p) => p.topic === t.slug).length }))
      .filter((t) => t.count > 0 || t.topic.slug === topic);
  }, [publications, dossiers, genre, topic]);

  const searching = query.trim().length > 0;
  const total = countOf(ALL);
  /** Un format n'apparaît que s'il contient au moins un contenu. */
  const genres = GENRES.filter((g) => g === ALL || g === genre || (g === DOSSIERS ? dossiers.length > 0 : publications.some((p) => publicationKind(p) === g.kind)));
  const filtered = searching || genre !== ALL || topic !== null;
  const selectedTopic = topic ? getTopic(topic) : null;
  const [lead, ...others] = results;
  useEffect(() => {
    if (consumeSearchFocus()) input.current?.focus();
  }, []);
  function clearFilters() { setQuery(""); setTopic(null); setGenre(ALL); }

  return (
    <div className="mt-8">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
        <label htmlFor="search" className="sr-only">Rechercher une actualité, un récit, un concept ou un dossier</label>
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
      <p className="mt-2 text-meta text-muted" aria-live="polite" data-testid="explore-count">
        <span className="font-mono">{total}</span> {searching ? plural(total, "résultat") : plural(total, "contenu")}
        {genres.filter((g) => g !== ALL).map((g) => (
          <span key={g.kind}>
            {" "}· <span className="font-mono">{countOf(g)}</span> {g.name.toLowerCase().replace(/s$/, countOf(g) > 1 ? "s" : "")}
          </span>
        ))}
      </p>

      {/* Formats : Tous, puis Actualités, Récits, Concepts, Dossiers. Sur petit écran, la ligne
          passe à la ligne au lieu de défiler : chaque filtre reste visible (320 px compris). */}
      <div role="group" aria-label="Filtrer par format" className="mt-8 flex flex-wrap gap-x-5 gap-y-1 border-b border-ink" data-testid="explore-genres">
        {genres.map((g) => {
          const selected = g === genre;
          return (
            <button key={g.kind} type="button" aria-pressed={selected} onClick={() => { setGenre(g); setTopic(null); }}
              data-testid={`genre-${g.param}`}
              className={"-mb-px min-h-11 shrink-0 border-b-[3px] pb-3 pt-1 text-left transition-colors " + (selected ? "border-accent" : "border-transparent hover:border-rule")}>
              <span className={"flex items-baseline gap-2 whitespace-nowrap font-display text-xl font-semibold leading-tight md:text-2xl " + (selected ? "text-ink" : "text-muted")}>
                {g.name}
                <span className="font-mono text-meta font-normal text-muted">{countOf(g)}</span>
              </span>
              <span className="mt-0.5 hidden text-sm leading-snug text-muted sm:block">{g.hint}</span>
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

      {genre === ALL && dossierResults.length > 0 && (
        <section aria-labelledby="dossiers" className="mt-8" data-testid="explore-dossiers">
          <h2 id="dossiers" className="border-b border-rule pb-2 font-display text-intertitre font-semibold text-ink">
            {searching ? "Dossiers correspondant à votre recherche" : "Dossiers"}
          </h2>
          <div className="mt-4 grid gap-4">
            {dossierResults.map((d) => <DossierTile key={d.id} dossier={d} />)}
          </div>
        </section>
      )}

      <section aria-labelledby="publications" className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2">
          <h2 id="publications" className="font-display text-intertitre font-semibold text-ink">
            {searching ? (genre === ALL ? "Résultats de votre recherche" : `${genre.name} correspondant à votre recherche`) : selectedTopic ? `${genre === ALL ? "Publications" : genre.name} · ${selectedTopic.name}` : genre.heading}
          </h2>
          <span className="flex items-baseline gap-3">
            <span className="font-mono text-meta text-muted" data-testid="explore-results-count">
              {genre === DOSSIERS ? `${dossierResults.length} ${plural(dossierResults.length, "dossier")}` : `${results.length} ${plural(results.length, "article")}`}
            </span>
            {filtered && (
              <button type="button" onClick={clearFilters} className="min-h-11 text-sm font-semibold text-accent underline-offset-4 hover:underline" data-testid="explore-clear">
                Effacer les filtres
              </button>
            )}
          </span>
        </div>
        {genre === DOSSIERS && dossierResults.length > 0 ? (
          <div className="mt-6 grid gap-4" data-testid="explore-dossiers">
            {dossierResults.map((d) => <DossierTile key={d.id} dossier={d} />)}
          </div>
        ) : lead ? (
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
            Rien dans {genre === ALL ? "cette rubrique" : "les " + genre.name.toLowerCase()} pour ces filtres.{" "}
            {genres.filter((g) => g !== genre && g !== ALL && countOf(g) > 0).map((g) => (
              <button key={g.kind} type="button" onClick={() => setGenre(g)} className="mr-3 font-semibold text-accent underline-offset-4 hover:underline">
                Voir les {countOf(g)} {g.name.toLowerCase()}
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
