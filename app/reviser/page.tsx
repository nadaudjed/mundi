import type { Metadata } from "next";
import { RevisionClient } from "@/components/RevisionClient";
import { PageIntro } from "@/components/PageIntro";
import { reviewCards } from "@/lib/flashcards";
import { feedPublications } from "@/lib/verified";

export const metadata: Metadata = { title: "Réviser les actualités et les cours" };

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-[calc(var(--nav-h)+3rem)] pt-8 md:px-8 md:pb-20 md:pt-12">
      <PageIntro title="Réviser">
        Chaque publication tient en trois idées. Essayez de vous les rappeler, puis vérifiez : les cartes que vous retenez reviennent de moins en moins souvent. Vos révisions restent sur cet appareil.
      </PageIntro>
      {/* Les cartes sont fabriquées au build : la page ne reçoit pas les publications entières. */}
      <RevisionClient cards={feedPublications.flatMap(reviewCards)} />
    </div>
  );
}
