"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { searchPublications, searchStories } from "@/lib/search";
import { feedStories } from "@/lib/stories";
import { getTopic, topics } from "@/lib/topics";
import type { TopicSlug } from "@/lib/types";
import type { FeedPublication } from "@/lib/verified";
import { Icon } from "./Icon";
import { PublicationTile } from "./PublicationTile";
import { StoryTile } from "./StoryTile";

export function ExploreClient({ publications }: { publications: FeedPublication[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [topic, setTopic] = useState<TopicSlug | null>(getTopic(params.get("sujet") ?? "")?.slug ?? null);

  // Preserve shareable search URLs, without navigating on every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams();
      if (query.trim()) next.set("q", query.trim());
      if (topic) next.set("sujet", topic);
      const href = next.size ? "/explorer/?" + next.toString() : "/explorer/";
      const current = params.size ? "/explorer/?" + params.toString() : "/explorer/";
      if (href !== current) router.replace(href, { scroll: false });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, topic, params, router]);

  const publishedResults = useMemo(() => {
    const found = searchPublications(publications, query);
    return topic ? found.filter((p) => p.topic === topic) : found;
  }, [publications, query, topic]);
  const demoResults = useMemo(() => {
    const found = query.trim() ? searchStories(query) : feedStories;
    return topic ? found.filter((s) => s.topic === topic) : found;
  }, [query, topic]);

  const counts = useMemo(() => {
    const all = new Map<string, { published: number; demo: number }>();
    topics.forEach((t) => all.set(t.slug, { published: 0, demo: 0 }));
    for (const p of publications) all.get(p.topic)!.published++;
    for (const s of feedStories) all.get(s.topic)!.demo++;
    return all;
  }, [publications]);

  /** Domaines avec au moins une publication sourcée d'abord ; les autres sur une ligne secondaire. */
  const withPublications = topics.filter((t) => counts.get(t.slug)!.published > 0);
  const withoutPublications = topics.filter((t) => counts.get(t.slug)!.published === 0);
  const searching = query.trim().length > 0;
  const selectedTopic = topic ? getTopic(topic) : null;
  const total = publishedResults.length + demoResults.length;
  function clearFilters() { setQuery(""); setTopic(null); }

  return (
    <div className="mt-8">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
        <label htmlFor="search" className="sr-only">Rechercher une publication ou un récit</label>
        <Icon name="search" className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <input id="search" type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Matières critiques, inflation, énergie…" autoComplete="off"
          className="h-14 w-full rounded-full border border-night/15 bg-paper pl-13 pr-12 text-base text-night shadow-sm placeholder:text-muted/70 focus:border-blue focus:outline-none focus:ring-4 focus:ring-blue/15" />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-night/5 hover:text-night">
            <Icon name="close" className="size-4" />
          </button>
        )}
      </form>
      <p className="mt-2 px-2 text-xs text-muted" aria-live="polite">
        {total} {searching ? `résultat${total > 1 ? "s" : ""}` : `contenu${total > 1 ? "s" : ""}`} · {publishedResults.length} publication{publishedResults.length > 1 ? "s" : ""} sourcée{publishedResults.length > 1 ? "s" : ""} · {demoResults.length} démonstration{demoResults.length > 1 ? "s" : ""}
      </p>

      <section aria-labelledby="sujets" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="sujets" className="text-xs font-bold uppercase tracking-[0.2em] text-blue-ink">Explorer par domaine</h2>
          {(topic || query) && <button type="button" onClick={clearFilters} className="text-sm font-semibold text-blue-ink underline underline-offset-4">Effacer les filtres</button>}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {withPublications.map((t) => {
            const selected = topic === t.slug;
            const n = counts.get(t.slug)!;
            return (
              <li key={t.slug}>
                <button type="button" aria-pressed={selected} onClick={() => setTopic(selected ? null : t.slug)}
                  className={"group relative flex h-full min-h-[9rem] w-full flex-col overflow-hidden rounded-[1.25rem] border p-3.5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-4 " +
                    (selected ? "border-night bg-night text-ivory shadow-lg" : "border-night/10 bg-paper text-night hover:border-night/25")}
                  style={{ backgroundImage: "radial-gradient(circle at 100% 0%, " + t.color + (selected ? "55" : "22") + ", transparent 70%)" }}>
                  <span className="mb-3 h-1.5 w-10 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
                  <span className="font-display text-[1rem] font-semibold leading-tight sm:text-[1.08rem]">{t.name}</span>
                  <span className={"mt-1 line-clamp-2 text-xs leading-snug " + (selected ? "text-ivory/75" : "text-muted")}>{t.description}</span>
                  <span className={"mt-auto pt-3 text-[0.69rem] font-semibold " + (selected ? "text-mint-soft" : "text-blue-ink")}>
                    {n.published} publication{n.published > 1 ? "s" : ""} · {n.demo} démo{n.demo > 1 ? "s" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {withoutPublications.length > 0 && (
          <p className="mt-4 text-sm leading-relaxed text-muted" data-testid="topics-without-publications">
            <span className="mr-1">Sans publication pour l&apos;instant :</span>
            {withoutPublications.map((t, i) => (
              <span key={t.slug}>
                <button type="button" aria-pressed={topic === t.slug} onClick={() => setTopic(topic === t.slug ? null : t.slug)}
                  className={"underline-offset-4 hover:text-night hover:underline " + (topic === t.slug ? "font-semibold text-night underline" : "")}>
                  {t.name}
                </button>
                {i < withoutPublications.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        )}
      </section>

      <section aria-labelledby="publications" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-night/10 pb-4">
          <div>
            <p className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#197560]">La rédaction MUNDI</p>
            <h2 id="publications" className="font-display text-2xl font-semibold text-night sm:text-3xl">
              {query.trim() ? "Publications correspondant à votre recherche" : selectedTopic ? "À lire en " + selectedTopic.name : "Les publications à découvrir"}
            </h2>
          </div>
          <span className="rounded-full bg-night px-3 py-1.5 text-xs font-bold text-ivory">{publishedResults.length} article{publishedResults.length > 1 ? "s" : ""}</span>
        </div>
        {publishedResults.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {publishedResults.map((p) => <PublicationTile key={p.slug} publication={p} />)}
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-dashed border-night/15 bg-paper p-7 text-sm leading-relaxed text-muted">
            Pas encore de publication sourcée sur ce sujet. Les démonstrations sont présentées séparément ci-dessous.
          </div>
        )}
      </section>

      <section aria-labelledby="demonstrations" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-night/10 pb-4">
          <div>
            <p className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#79571c]">Espace pédagogique · Contenus fictifs</p>
            <h2 id="demonstrations" className="font-display text-2xl font-semibold text-night">Récits de démonstration</h2>
          </div>
          <span className="rounded-full border border-amber/40 bg-amber/10 px-3 py-1.5 text-xs font-bold text-[#79571c]">{demoResults.length} exemple{demoResults.length > 1 ? "s" : ""}</span>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Ces récits permettent de découvrir MUNDI. Leurs données, dates et sources sont illustratives et ne constituent pas des actualités.
        </p>
        {demoResults.length ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {demoResults.map((s) => <StoryTile key={s.slug} story={s} />)}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl border border-dashed border-night/15 p-6 text-sm text-muted">Aucun exemple correspondant à ces filtres.</p>
        )}
      </section>
      {total === 0 && (
        <div role="status" className="mt-8 rounded-3xl bg-night p-6 text-ivory">
          <p className="font-display text-xl font-semibold">Aucun résultat trouvé</p>
          <p className="mt-1 text-sm text-ivory/75">Essayez une autre recherche ou un autre sujet.</p>
          <button type="button" onClick={clearFilters} className="mt-4 rounded-full bg-mint px-5 py-2.5 text-sm font-bold text-night hover:bg-mint-soft">Tout afficher</button>
        </div>
      )}
    </div>
  );
}
