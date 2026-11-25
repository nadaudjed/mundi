import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, responsable de la publication, contact et hébergeur de MUNDI.",
};

/** Contact public choisi par le fondateur (ticket #37) : une adresse e-mail, pas de téléphone. */
const CONTACT = "Jacquesdesirenadaud@gmail.com";

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <PageIntro title="Mentions légales">
        MUNDI est un site d&apos;information en version bêta. Voici qui le publie et comment nous joindre.
      </PageIntro>
      <dl className="mt-8 grid gap-6 text-base leading-relaxed">
        <div>
          <dt className="font-semibold text-ink">Éditeur et responsable de la publication</dt>
          <dd className="mt-1 text-muted">Jacques Nadaud</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Contact</dt>
          <dd className="mt-1 text-muted">
            <a href={`mailto:${CONTACT}`} className="font-semibold text-accent underline underline-offset-4" data-testid="legal-contact">{CONTACT}</a>
            <br />
            Pour signaler une erreur, demander une correction ou un retrait.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Hébergeur</dt>
          <dd className="mt-1 text-muted">
            Netlify, Inc., 101 2nd Street, San Francisco, CA 94105, États-Unis ·{" "}
            <a href="https://www.netlify.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">netlify.com</a>
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Contenus et images</dt>
          <dd className="mt-1 text-muted">
            Chaque publication cite ses sources. Les photos d&apos;illustration viennent de Wikimedia Commons, avec leur auteur et leur licence
            indiqués sous l&apos;image.
          </dd>
        </div>
      </dl>
      <p className="mt-10 text-sm text-muted">
        <Link href="/confidentialite/" className="font-semibold text-accent underline underline-offset-4">Confidentialité</Link>
        {" · "}
        <Link href="/a-propos/" className="font-semibold text-accent underline underline-offset-4">À propos de MUNDI</Link>
      </p>
    </div>
  );
}
