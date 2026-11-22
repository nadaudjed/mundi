import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreClient } from "@/components/ExploreClient";
import { PageIntro } from "@/components/PageIntro";

export const metadata: Metadata = { title: "Explorer" };

export default function ExplorerPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <PageIntro eyebrow="Explorer" title="Choisir un sujet, chercher un mot">
        Parcourez les récits par thème ou lancez une recherche. Tous les contenus présentés ici sont illustratifs.
      </PageIntro>
      <Suspense fallback={<div className="mt-8 h-14 rounded-full bg-paper" />}>
        <ExploreClient />
      </Suspense>
    </div>
  );
}
