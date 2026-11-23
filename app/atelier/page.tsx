import type { Metadata } from "next";
import { EditorialStudio } from "@/components/EditorialStudio";
import { PageIntro } from "@/components/PageIntro";

export const metadata: Metadata = { title: "Atelier éditorial — brouillons", robots: { index: false, follow: false } };

export default function StudioPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <PageIntro eyebrow="MUNDI Studio" title="Préparer un récit">
        Rédigez une fiche structurée et téléchargez un brouillon pour la vérification éditoriale. Aucun contenu ne sera publié automatiquement.
      </PageIntro>
      <EditorialStudio />
    </div>
  );
}
