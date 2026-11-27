import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { SavedClient } from "@/components/SavedClient";
import { FollowedDossiers } from "@/components/dossier/FollowedDossiers";
import { dossierSummaries } from "@/lib/dossiers";
import { toSavedItem } from "@/lib/light-publications";
import { feedPublications } from "@/lib/verified";

export const metadata: Metadata = { title: "Bibliothèque" };

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <PageIntro title="Bibliothèque">
        Les dossiers que vous suivez et les articles que vous avez enregistrés. Ils sont conservés dans ce navigateur, sur cet appareil uniquement. Aucun compte n&apos;est nécessaire.{" "}
        Vous lisiez MUNDI à son ancienne adresse ? <a href="/transfert/" className="font-medium text-ink underline underline-offset-4">Récupérez vos favoris et dossiers suivis</a>.
      </PageIntro>
      <FollowedDossiers dossiers={dossierSummaries()} />
      <section aria-labelledby="articles-enregistres" className="mt-12">
        <h2 id="articles-enregistres" className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">Articles enregistrés</h2>
        <SavedClient publications={feedPublications.map(toSavedItem)} />
      </section>
    </div>
  );
}
