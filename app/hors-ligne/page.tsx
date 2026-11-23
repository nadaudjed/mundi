import type { Metadata } from "next";
import { LogoMark } from "@/components/Logo";

export const metadata: Metadata = { title: "Hors connexion" };

/** Page affichée par le service worker quand le réseau est indisponible. */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <LogoMark className="size-14" />
      <h1 className="mt-6 font-display text-3xl font-semibold text-night">Vous êtes hors connexion</h1>
      <p className="mt-3 leading-relaxed text-muted">
        MUNDI a besoin d&apos;Internet pour afficher les récits. Vos enregistrements et vos sujets restent sur cet appareil :
        vous les retrouverez dès le retour du réseau.
      </p>
      {/* Lien simple (rechargement complet) : il fonctionne même sans JavaScript. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="mt-8 rounded-full bg-night px-6 py-3 text-sm font-semibold text-ivory hover:bg-blue">
        Réessayer
      </a>
    </div>
  );
}
