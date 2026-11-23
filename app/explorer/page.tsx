import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ExploreClient } from "@/components/ExploreClient";
import { PageIntro } from "@/components/PageIntro";
import { feedPublications } from "@/lib/verified";

export const metadata: Metadata = { title: "Explorer les sujets et les publications" };

export default function ExplorerPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-[calc(var(--nav-h)+3rem)] pt-8 md:px-8 md:pb-20 md:pt-12">
      <PageIntro eyebrow="Découvrir le monde" title="Explorer les sujets et les publications">
        Recherchez dans les articles sourcés de la rédaction et les parcours pédagogiques de démonstration. Les deux catégories restent clairement identifiées.
      </PageIntro>
      <Link href="/actualites/" className="group mt-7 flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-night px-5 py-4 text-ivory shadow-lg shadow-night/10 transition hover:bg-night-2">
        <span>
          <strong className="block font-display text-xl">Les dernières publications</strong>
          <span className="mt-1 block text-sm text-ivory/75">{feedPublications.length} article{feedPublications.length > 1 ? "s" : ""} sourcé{feedPublications.length > 1 ? "s" : ""} · vérification indiquée sur chaque article</span>
        </span>
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint/15 text-2xl text-mint transition-transform group-hover:translate-x-1">↗</span>
      </Link>
      <Suspense fallback={<div className="mt-8 h-14 animate-pulse rounded-full bg-paper" />}>
        <ExploreClient publications={feedPublications} />
      </Suspense>
    </div>
  );
}
