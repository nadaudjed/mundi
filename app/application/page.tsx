import type { Metadata } from "next";
import { InstallPanel } from "@/components/InstallButton";
import { PageIntro } from "@/components/PageIntro";

export const metadata: Metadata = { title: "Installer l'application" };

export default function InstallPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <PageIntro eyebrow="Application" title="Installer MUNDI sur votre écran d'accueil">
        MUNDI s&apos;ouvre alors comme une application, en plein écran. Rien à télécharger depuis un magasin d&apos;applications.
      </PageIntro>
      <InstallPanel />
      <section className="mt-10 rounded-3xl bg-ivory-2/70 p-6 text-[0.95rem] leading-relaxed text-night/85">
        <h2 className="font-display text-xl font-semibold text-night">Ce que l&apos;application fait, et ne fait pas</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>Elle ouvre MUNDI plus vite, depuis une icône, sans barre de navigateur.</li>
          <li>Vos enregistrements et vos sujets restent sur votre appareil.</li>
          <li>
            Elle <strong>ne fonctionne pas hors connexion</strong> : sans réseau, une page vous l&apos;indique.
          </li>
          <li>Aucune notification, aucun compte, aucune donnée envoyée.</li>
        </ul>
      </section>
    </div>
  );
}
