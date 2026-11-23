import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ExploreClient } from "@/components/ExploreClient";
import { PageIntro } from "@/components/PageIntro";

export const metadata: Metadata = { title: "Explorer" };

export default function ExplorerPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <PageIntro eyebrow="Explorer" title="Choisir un sujet, chercher un mot">
        Parcourez les récits par thème ou lancez une recherche. Tous les contenus présentés ici sont illustratifs.
      </PageIntro>
      <Link href="/actualites/" className="mt-7 flex items-center justify-between rounded-2xl bg-night p-5 text-ivory transition hover:bg-night-2">
        <span><strong className="block font-display text-xl">Publications vérifiées</strong><span className="mt-1 block text-sm text-ivory/70">Voir les récits sourcés et relus par la rédaction</span></span>
        <span aria-hidden="true" className="text-2xl text-mint">↗</span>
      </Link>
      <Suspense fallback={<div className="mt-8 h-14 rounded-full bg-paper" />}>
        <ExploreClient />
      </Suspense>
    </div>
  );
}
