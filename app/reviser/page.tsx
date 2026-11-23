import type { Metadata } from "next";
import { RevisionClient } from "@/components/RevisionClient";
import { PageIntro } from "@/components/PageIntro";
import { feedPublications } from "@/lib/verified";

export const metadata: Metadata = { title: "Réviser les actualités et les cours" };

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-[calc(var(--nav-h)+3rem)] pt-8 md:px-8 md:pb-20 md:pt-12">
      <PageIntro eyebrow="Apprendre avec MUNDI" title="Ne scrollez pas seulement. Retenez.">
        Retenez l&apos;essentiel des publications de la rédaction et entraînez-vous avec les exemples pédagogiques. Vos révisions restent privées sur votre appareil.
      </PageIntro>
      <RevisionClient publications={feedPublications} />
    </div>
  );
}
