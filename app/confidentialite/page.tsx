import type { Metadata } from "next";
import Link from "next/link";
import { ClearLocalData } from "@/components/ClearLocalData";
import { PageIntro } from "@/components/PageIntro";
import { LOCAL_DATA } from "@/lib/local-data";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Ce que MUNDI garde sur votre appareil, ce qui n'est jamais collecté, et comment tout effacer.",
};

const never = [
  "Pas de compte ni d'inscription.",
  "Pas de cookie.",
  "Pas de mesure d'audience, de publicité ni de pistage par un tiers.",
  "Les polices et les images sont servies par le site lui-même, sans service extérieur.",
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <PageIntro title="Vos données restent sur votre appareil.">
        Cette page décrit, en termes simples, comment fonctionne le site aujourd&apos;hui. Elle sera mise à jour si cela change.
      </PageIntro>

      <section aria-labelledby="jamais" className="mt-10">
        <h2 id="jamais" className="font-display text-2xl font-semibold text-ink">Ce que MUNDI ne fait pas</h2>
        <ul className="mt-4 space-y-2 text-[0.95rem] leading-relaxed text-ink/85">
          {never.map((t) => (
            <li key={t} className="border-l-2 border-accent pl-3">{t}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="appareil" className="mt-10">
        <h2 id="appareil" className="font-display text-2xl font-semibold text-ink">Ce qui est gardé sur votre appareil</h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-ink/85">
          Pour retenir vos choix, MUNDI utilise le stockage local de votre navigateur. Ces informations ne quittent pas votre appareil et ne sont
          jamais envoyées à MUNDI.
        </p>
        <dl className="mt-4 divide-y divide-night/10 rounded-2xl bg-surface ring-1 ring-rule" data-testid="local-data">
          {LOCAL_DATA.map(({ key, what }) => (
            <div key={key} className="px-5 py-4">
              <dt className="font-mono text-xs text-accent">{key}</dt>
              <dd className="mt-1 text-[0.95rem] leading-relaxed text-ink/85">{what}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-ink/85">
          Si vous installez l&apos;application, votre navigateur garde aussi une copie des fichiers du site (styles, scripts, polices) et une page
          « hors connexion ». Aucune donnée personnelle n&apos;y est mise.
        </p>
        <div className="mt-5">
          <ClearLocalData />
        </div>
      </section>

      <section aria-labelledby="tiers" className="mt-10">
        <h2 id="tiers" className="font-display text-2xl font-semibold text-ink">Quand d&apos;autres services interviennent</h2>
        <ul className="mt-4 space-y-3 text-[0.95rem] leading-relaxed text-ink/85">
          <li>
            <strong className="font-semibold text-ink">Hébergement.</strong> Le site est hébergé par Netlify. Comme tout hébergeur, il reçoit
            les informations techniques nécessaires pour afficher les pages (par exemple l&apos;adresse IP de votre connexion).
          </li>
          <li>
            <strong className="font-semibold text-ink">Notifications.</strong> Seulement si vous les activez dans « Mes sujets ». Votre
            navigateur fournit alors une adresse technique d&apos;abonnement, gardée chez Netlify pour envoyer l&apos;annonce des éditions
            (via le service de notifications de votre appareil : Apple, Google ou Mozilla). Ni nom, ni e-mail, ni historique de lecture.
            Désactiver l&apos;interrupteur supprime cette adresse.
          </li>
          <li>
            <strong className="font-semibold text-ink">Liens vers les sources.</strong> Un lien vers une source ouvre le site d&apos;un autre
            éditeur, qui applique ses propres règles.
          </li>
          <li>
            <strong className="font-semibold text-ink">Écouter.</strong> La lecture à voix haute utilise la voix de votre appareil. Selon vos
            réglages, votre système peut utiliser une voix en ligne.
          </li>
          <li>
            <strong className="font-semibold text-ink">Partager.</strong> Le bouton Partager ouvre le partage de votre téléphone ou copie le
            lien. MUNDI ne voit pas à qui vous l&apos;envoyez.
          </li>
        </ul>
      </section>

      <p className="mt-10 text-sm text-muted">
        Les mentions légales (éditeur, contact, responsable de publication) seront ajoutées avant l&apos;ouverture au public.{" "}
        <Link href="/a-propos/" className="font-semibold text-accent underline underline-offset-4">À propos de MUNDI</Link>
      </p>
    </div>
  );
}
