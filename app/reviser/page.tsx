import type { Metadata } from "next";
import { RevisionClient } from "@/components/RevisionClient";
import { PageIntro } from "@/components/PageIntro";

export const metadata: Metadata = { title: "Réviser" };

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <PageIntro eyebrow="Apprendre avec MUNDI" title="Ne scrollez pas seulement. Retenez.">
        Mettez votre mémoire à l'épreuve en retrouvant les trois idées essentielles de chaque récit.
      </PageIntro>
      <RevisionClient />
    </div>
  );
}
