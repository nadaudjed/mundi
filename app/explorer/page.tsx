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
      <PageIntro title="Explorer">
        Deux espaces séparés : les actualités, pour savoir ce qui vient de changer, et les concepts, pour comprendre les notions qui reviennent dans l’actualité. Tous les articles sont sourcés.
      </PageIntro>
      <p className="mt-4 text-sm text-muted">
        <Link href="/actualites/" className="font-semibold text-accent underline-offset-4 hover:underline">
          Toutes les publications
        </Link>{" "}
        <span className="font-mono">({feedPublications.length})</span>, de la plus récente à la plus ancienne.
      </p>
      <Suspense fallback={<div className="mt-8 h-12 border-b border-rule" />}>
        <ExploreClient publications={feedPublications} />
      </Suspense>
    </div>
  );
}
