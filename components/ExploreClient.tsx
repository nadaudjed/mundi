"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { searchStories } from "@/lib/search";
import { feedStories } from "@/lib/stories";
import { getTopic, topics } from "@/lib/topics";
import type { TopicSlug } from "@/lib/types";
import { Icon } from "./Icon";
import { StoryTile } from "./StoryTile";

export function ExploreClient() {
  const params = useSearchParams();
  const router = useRouter();
  const initialTopic = (getTopic(params.get("sujet") ?? "")?.slug ?? null) as TopicSlug | null;
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [topic, setTopic] = useState<TopicSlug | null>(initialTopic);

  // Garde l'adresse de la page synchronisée, pour pouvoir partager une recherche.
  useEffect(() => {
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (topic) next.set("sujet", topic);
    const qs = next.toString();
    router.replace(qs ? `/explorer/?${qs}` : "/explorer/", { scroll: false });
  }, [query, topic, router]);

  const results = useMemo(() => {
    const base = query.trim() ? searchStories(query) : feedStories;
    return topic ? base.filter((s) => s.topic === topic) : base;
  }, [query, topic]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    feedStories.forEach((s) => m.set(s.topic, (m.get(s.topic) ?? 0) + 1));
    return m;
  }, []);

  const activeTopic = topic ? getTopic(topic) : null;

  return (
    <div className="mt-8">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
        <label htmlFor="search" className="sr-only">
          Rechercher un récit
        </label>
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted" />
        <input
          id="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Inflation, batteries, détroits…"
          autoComplete="off"
          className="h-14 w-full rounded-full border border-night/15 bg-paper pr-12 pl-13 text-base text-night shadow-sm placeholder:text-muted/70 focus:border-blue focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-blue/15"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-night/5 hover:text-night"
            aria-label="Effacer la recherche"
          >
            <Icon name="close" className="size-4" />
          </button>
        )}
      </form>

      <section aria-labelledby="sujets" className="mt-10">
        <h2 id="sujets" className="text-xs font-semibold uppercase tracking-[0.2em] text-blue">
          Sujets
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {topics.map((t) => {
            const selected = topic === t.slug;
            const n = counts.get(t.slug) ?? 0;
            return (
              <li key={t.slug}>
                <button
                  type="button"
                  onClick={() => setTopic(selected ? null : t.slug)}
                  aria-pressed={selected}
                  className={`group flex h-full w-full flex-col items-start rounded-2xl p-4 text-left ring-1 transition ${
                    selected ? "bg-night text-ivory ring-night" : "bg-paper text-night ring-night/8 hover:ring-night/25"
                  }`}
                >
                  <span className="mb-3 h-1.5 w-8 rounded-full" style={{ background: t.color }} aria-hidden="true" />
                  <span className="font-semibold">{t.name}</span>
                  <span className={`mt-1 text-xs leading-snug ${selected ? "text-ivory/70" : "text-muted"}`}>{t.description}</span>
                  <span className={`mt-3 text-xs font-medium ${selected ? "text-mint-soft" : "text-blue"}`}>
                    {n} récit{n > 1 ? "s" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="resultats" className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="resultats" className="font-display text-2xl font-semibold text-night">
            {query.trim() ? `Résultats pour « ${query.trim()} »` : activeTopic ? activeTopic.name : "Tous les récits"}
          </h2>
          <p className="text-sm text-muted" aria-live="polite">
            {results.length} récit{results.length > 1 ? "s" : ""}
            {activeTopic && query.trim() ? ` en ${activeTopic.name}` : ""}
          </p>
        </div>
        {results.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {results.map((s) => (
              <StoryTile key={s.slug} story={s} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-3xl border border-dashed border-night/20 p-8 text-center">
            <p className="font-medium text-night">Aucun récit ne correspond à cette recherche.</p>
            <p className="mt-1 text-sm text-muted">Essayez un autre mot, ou retirez le filtre de sujet.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTopic(null);
              }}
              className="mt-4 rounded-full bg-night px-5 py-2 text-sm font-medium text-ivory hover:bg-blue"
            >
              Tout afficher
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
