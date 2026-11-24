"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchPublications, searchStories } from "@/lib/search";
import { feedStories } from "@/lib/stories";
import { getTopic, topics } from "@/lib/topics";
import type { TopicSlug } from "@/lib/types";
import type { FeedPublication } from "@/lib/verified";
import { Icon } from "./Icon";
import { PublicationTile } from "./PublicationTile";
import { StoryTile } from "./StoryTile";

const plural = (n: number, one: string, many = one + "s") => (n > 1 ? many : one);

export function ExploreClient({ publications }: { publications: FeedPublication[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [topic, setTopic] = useState<TopicSlug | null>(getTopic(params.get("sujet") ?? "")?.slug ?? null);
  const input = useRef<HTMLInputElement>(null);

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
  const [lead, ...others] = publishedResults;
  function clearFilters() { setQuery(""); setTopic(null); }

  return (
    <div className="mt-8">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
        <label htmlFor="search" className="sr-only">Rechercher une publication ou un récit</label>
        <Icon name="search" className="pointer-events-none absolute left-0 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <input id="search" ref={input} type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Matières critiques, inflation, énergie…" autoComplete="off"
          className="h-14 w-full border-0 border-b-2 border-ink bg-transparent pl-8 pr-12 font-display text-xl text-ink placeholder:text-muted focus:border-accent focus:outline-none" />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche"
            className="absolute right-0 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-sm text-muted hover:text-ink">
            <Icon name="close" className="size-4" />
          </button>
        )}
      </form>
      <p className="mt-2 flex flex-wrap justify-between gap-2 text-meta text-muted" aria-live="polite">
        <span>
          <span className="font-mono">{total}</span> {searching ? plural(total, "résultat") : plural(total, "contenu")} ·{" "}
          <span className="font-mono">{publishedResults.length}</span> {plural(publishedResults.length, "publication sourcée", "publications sourcées")} ·{" "}
          <span className="font-mono">{demoResults.length}</span> {plural(demoResults.length, "démonstration")}
        </span>
      </p>

      <section aria-labelledby="sujets" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink pb-2">
          <h2 id="sujets" className="font-display text-intertitre font-semibold text-ink">Rubriques</h2>
          {(topic || query) && <button type="button" onClick={clearFilters} className="text-sm font-semibold text-accent underline-offset-4 hover:underline">Effacer les filtres</button>}
        </div>
        <ul className="grid sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
          {withPublications.map((t) => {
            const selected = topic === t.slug;
            const n = counts.get(t.slug)!;
            return (
              <li key={t.slug} className="border-b border-rule">
                <button type="button" aria-pressed={selected} onClick={() => setTopic(selected ? null : t.slug)}
                  className="group flex w-full items-baseline justify-between gap-4 py-3.5 text-left">
                  <span className="min-w-0">
                    <span className={"title-link font-display text-lg font-semibold leading-tight " + (selected ? "text-accent" : "text-ink")}>{t.name}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-muted">{t.description}</span>
                  </span>
                  <span className="shrink-0 text-right font-mono text-meta text-muted">
                    {n.published} {plural(n.published, "publication")}
                    {n.demo > 0 && <span className="block">{n.demo} {plural(n.demo, "démo")}</span>}
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
                  className={"underline-offset-4 hover:text-ink hover:underline " + (topic === t.slug ? "font-semibold text-accent underline" : "")}>
                  {t.name}
                </button>
                {i < withoutPublications.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        )}
      </section>

      <section aria-labelledby="publications" className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-2">
          <h2 id="publications" className="font-display text-intertitre font-semibold text-ink">
            {searching ? "Publications correspondant à votre recherche" : selectedTopic ? "À lire en " + selectedTopic.name : "Les publications à découvrir"}
          </h2>
          <span className="font-mono text-meta text-muted">{publishedResults.length} {plural(publishedResults.length, "article")}</span>
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
        ) : (
          <p className="mt-5 text-sm leading-relaxed text-muted">
            Pas encore de publication sourcée sur ce sujet. Les démonstrations sont présentées séparément ci-dessous.
          </p>
        )}
      </section>

      <section aria-labelledby="demonstrations" className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink pb-2">
          <h2 id="demonstrations" className="font-display text-intertitre font-semibold text-ink">Récits de démonstration</h2>
          <span className="font-mono text-meta text-muted">{demoResults.length} {plural(demoResults.length, "exemple")}</span>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Espace pédagogique · Contenus fictifs. Ces récits permettent de découvrir MUNDI : leurs données, dates et sources sont illustratives et ne constituent pas des actualités.
        </p>
        {demoResults.length ? (
          <div className="mt-4 grid lg:grid-cols-2 lg:gap-x-8">
            {demoResults.map((s) => <StoryTile key={s.slug} story={s} />)}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted">Aucun exemple correspondant à ces filtres.</p>
        )}
      </section>
      {total === 0 && (
        <div role="status" className="mt-10 border-t border-ink pt-4">
          <p className="font-display text-xl font-semibold text-ink">Aucun résultat trouvé</p>
          <p className="mt-1 text-sm text-muted">Essayez une autre recherche ou un autre sujet.</p>
          <button type="button" onClick={clearFilters} className="btn btn-secondary mt-4">Tout afficher</button>
        </div>
      )}
    </div>
  );
}
