import type { Metadata } from "next";
import Link from "next/link";
import { DemoNotice } from "@/components/DemoBadge";
import { PageIntro } from "@/components/PageIntro";
import { formats } from "@/lib/topics";

export const metadata: Metadata = { title: "À propos" };

const pillars = [
  { title: "Informer", text: "Ce qui s'est passé, avec des sources attribuées et accessibles." },
  { title: "Expliquer", text: "Pourquoi c'est arrivé : causes, mécanismes, contexte." },
  { title: "Explorer", text: "Ce qui pourrait suivre, en nommant clairement les incertitudes." },
];

const commitments = [
  ["Faits vérifiables", "Attribuer les informations, croiser les sources lorsque l'enjeu l'exige."],
  ["Contexte", "Distinguer ce qui s'est passé, pourquoi, et les conséquences envisageables."],
  ["Indépendance", "Signaler tout partenariat ; distinguer publicité, opinion et information."],
  ["Prudence", "Nommer les incertitudes, éviter les titres trompeurs et les fausses certitudes."],
  ["Pluralité", "Présenter les perspectives pertinentes, sans fausse équivalence."],
  ["Transparence", "Dates de publication et de mise à jour, liens vers les sources, corrections visibles."],
  ["Droits", "N'utiliser que des médias produits, autorisés ou sous licence appropriée."],
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <PageIntro eyebrow="À propos" title="Comprendre le monde n'a jamais été aussi simple.">
        MUNDI est un média numérique indépendant qui rend les événements et les dynamiques du monde compréhensibles, sans
        sacrifier la rigueur.
      </PageIntro>

      <DemoNotice className="mt-8" />

      <section aria-labelledby="piliers" className="mt-12">
        <h2 id="piliers" className="text-xs font-semibold uppercase tracking-[0.2em] text-blue">
          Notre méthode
        </h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {pillars.map((p, i) => (
            <li key={p.title} className="rounded-3xl bg-night p-6 text-ivory">
              <span className="font-display text-3xl font-semibold text-mint">{i + 1}</span>
              <p className="mt-2 font-display text-xl font-semibold">{p.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ivory/75">{p.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="formats" className="mt-12">
        <h2 id="formats" className="font-display text-2xl font-semibold text-night">
          Nos formats
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.values(formats).map((f) => (
            <div key={f.slug} className="rounded-2xl bg-paper p-5 ring-1 ring-night/8">
              <dt className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-night">{f.name}</span>
                <span className="text-xs font-medium text-blue">{f.duration}</span>
              </dt>
              <dd className="mt-1 text-sm text-muted">{f.description}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="engagements" className="mt-12">
        <h2 id="engagements" className="font-display text-2xl font-semibold text-night">
          Nos engagements éditoriaux
        </h2>
        <ul className="mt-4 divide-y divide-night/10 border-y border-night/10">
          {commitments.map(([title, text]) => (
            <li key={title} className="grid gap-1 py-4 md:grid-cols-[12rem_1fr] md:gap-6">
              <span className="font-semibold text-night">{title}</span>
              <span className="text-[0.95rem] leading-relaxed text-muted">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ia" className="mt-12 rounded-3xl bg-ivory-2/70 p-6 md:p-8">
        <h2 id="ia" className="font-display text-xl font-semibold text-night">
          Intelligence artificielle et relecture humaine
        </h2>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-night/85">
          L&apos;IA peut aider à rechercher, résumer, traduire ou structurer. Les éléments factuels sont contrôlés par un
          humain avant publication, et aucune synthèse d&apos;actualité n&apos;est publiée automatiquement. Les erreurs
          significatives sont documentées et les corrections rendues visibles.
        </p>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/" className="rounded-full bg-night px-5 py-2.5 text-sm font-medium text-ivory hover:bg-blue">
          Découvrir le fil
        </Link>
        <Link href="/actualites/" className="rounded-full border border-night/20 px-5 py-2.5 text-sm font-medium text-night hover:border-night/50">Publications vérifiées</Link>
        <Link href="/atelier/" className="rounded-full border border-night/20 px-5 py-2.5 text-sm font-medium text-night hover:border-night/50">Atelier éditorial</Link>
        <Link href="/explorer/" className="rounded-full border border-night/20 px-5 py-2.5 text-sm font-medium text-night hover:border-night/50">
          Explorer les sujets
        </Link>
        <Link href="/application/" className="rounded-full border border-night/20 px-5 py-2.5 text-sm font-medium text-night hover:border-night/50">
          Installer l&apos;application
        </Link>
      </div>
    </div>
  );
}
