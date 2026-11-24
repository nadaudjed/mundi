"use client";

import Link from "next/link";
import { useBookmarks } from "@/lib/bookmarks";
import { formatDate } from "@/lib/format";
import { getTopic } from "@/lib/topics";
import type { FeedPublication } from "@/lib/verified";
import { publicationKey, publicationPath } from "@/lib/publication-links";
import { verificationLabel } from "@/lib/verification";
import { NewsDate } from "./NewsDate";

export function SavedClient({ publications = [] }: { publications?: FeedPublication[] }) {
  const { saved, clear } = useBookmarks();
  const savedPublications = publications.filter((p) => saved.includes(publicationKey(p.slug)));
  const total = savedPublications.length;

  if (total === 0) {
    return (
      <div className="mt-8">
        <p className="font-display text-xl font-semibold text-ink">Rien d&apos;enregistré pour l&apos;instant</p>
        <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">
          Touchez « Enregistrer » sur une publication pour la retrouver ici plus tard.
        </p>
        <Link href="/" className="btn btn-primary mt-5">Parcourir le fil</Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between border-b border-ink pb-2">
        <p className="text-sm text-muted">
          <span className="font-mono">{total}</span> contenu{total > 1 ? "s" : ""} enregistré{total > 1 ? "s" : ""}
        </p>
        <button type="button" onClick={clear} className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
          Tout effacer
        </button>
      </div>
      <div className="grid lg:grid-cols-2 lg:gap-x-8">
        {savedPublications.map((p) => (
          <article key={p.slug} data-testid="saved-publication" className="group min-w-0 border-b border-rule py-4">
            <p className="text-meta font-semibold text-accent">{getTopic(p.topic)?.name}</p>
            <NewsDate publication={p} className="mt-0.5 text-meta font-semibold text-ink" />
            <h2 className="mt-1 font-display text-lg leading-snug font-semibold text-ink text-balance">
              <Link href={publicationPath(p.slug)} className="title-link">{p.title}</Link>
            </h2>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{p.summary}</p>
            <p className="mt-2 text-meta text-muted">
              {verificationLabel(p)} · publié le <time dateTime={p.publishedAt} className="font-mono">{formatDate(p.publishedAt)}</time> · <span className="font-mono">{p.sources.length}</span> sources
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
