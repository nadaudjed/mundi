import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { DataTransfer } from "@/components/DataTransfer";

export const metadata: Metadata = { title: "Transférer mes données", robots: { index: false, follow: false } };

/**
 * Changement d'adresse (#129) : les favoris, dossiers suivis, sujets, thème et progression de « Réviser »
 * sont gardés par le navigateur pour une adresse donnée. Cette page les emporte de l'ancienne adresse
 * Netlify vers l'adresse officielle Cloudflare, ou depuis un fichier de sauvegarde.
 */
export default function TransferPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <PageIntro title="Transférer mes données">
        MUNDI a changé d&apos;adresse. Vos favoris, dossiers suivis, sujets, thème et révisions sont gardés par votre navigateur, rattachés à
        l&apos;ancienne adresse : cette page les emporte vers la nouvelle, sans compte et sans passer par un serveur.
      </PageIntro>
      <DataTransfer />
    </div>
  );
}
