import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { SavedClient } from "@/components/SavedClient";

export const metadata: Metadata = { title: "Enregistrés" };

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <PageIntro eyebrow="Enregistrés" title="Vos récits à reprendre">
        Ils sont conservés dans ce navigateur, sur cet appareil uniquement. Aucun compte n&apos;est nécessaire.
      </PageIntro>
      <SavedClient />
    </div>
  );
}
