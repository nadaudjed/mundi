import type { Metadata } from "next";
import { InterestsClient } from "@/components/InterestsClient";
import { PageIntro } from "@/components/PageIntro";

export const metadata: Metadata = { title: "Mes sujets" };

export default function MyTopicsPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <PageIntro title="Mes sujets">
        Choisissez les rubriques qui passent en premier dans votre fil « Pour vous ». Les autres rubriques restent proposées ensuite, et vos choix restent sur cet appareil.
      </PageIntro>
      <InterestsClient />
    </div>
  );
}
