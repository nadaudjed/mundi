import type { Metadata } from "next";
import { InterestsClient } from "@/components/InterestsClient";
import { PageIntro } from "@/components/PageIntro";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = { title: "Mes sujets" };

export default function MyTopicsPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <PageIntro title="Mes sujets">
        Choisissez les rubriques qui passent en premier dans votre fil « Pour vous ». Les autres rubriques restent proposées ensuite, et vos choix restent sur cet appareil.
      </PageIntro>
      <InterestsClient />
      <section aria-labelledby="affichage" className="mt-14 border-t border-rule pt-6">
        <h2 id="affichage" className="font-display text-intertitre font-semibold text-ink">Affichage</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          MUNDI suit le mode clair ou sombre de votre appareil. Vous pouvez imposer l’un ou l’autre ; ce choix reste sur cet appareil.
        </p>
        <ThemeToggle withLabel className="mt-4" />
      </section>
    </div>
  );
}
