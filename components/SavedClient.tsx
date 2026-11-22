"use client";

import Link from "next/link";
import { useBookmarks } from "@/lib/bookmarks";
import { getStory } from "@/lib/stories";
import type { Story } from "@/lib/types";
import { Icon } from "./Icon";
import { StoryTile } from "./StoryTile";

export function SavedClient() {
  const { saved, clear } = useBookmarks();
  const items = saved.map(getStory).filter((s): s is Story => Boolean(s));

  if (items.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center rounded-3xl bg-paper px-6 py-14 text-center ring-1 ring-night/8">
        <span className="flex size-14 items-center justify-center rounded-full bg-mint/15 text-[#0f6e5b]">
          <Icon name="bookmark" className="size-7" />
        </span>
        <p className="mt-4 font-display text-xl font-semibold text-night">Rien d&apos;enregistré pour l&apos;instant</p>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">
          Touchez l&apos;icône « Enregistrer » sur un récit pour le retrouver ici plus tard.
        </p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-night px-5 py-2.5 text-sm font-medium text-ivory hover:bg-blue">
          Parcourir le fil
          <Icon name="arrow-right" className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {items.length} récit{items.length > 1 ? "s" : ""} enregistré{items.length > 1 ? "s" : ""}
        </p>
        <button type="button" onClick={clear} className="text-sm font-medium text-muted underline-offset-4 hover:text-night hover:underline">
          Tout effacer
        </button>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {items.map((s) => (
          <StoryTile key={s.slug} story={s} />
        ))}
      </div>
    </div>
  );
}
