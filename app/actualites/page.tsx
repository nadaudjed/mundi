import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { PublicationTile } from "@/components/PublicationTile";
import { verifiedPublications as publishedArticles } from "@/lib/verified";

export const metadata: Metadata = { title: "Publications documentées" };

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-[calc(var(--nav-h)+3rem)] pt-8 md:px-8 md:pb-20 md:pt-12">
      <PageIntro eyebrow="La rédaction MUNDI" title="Les publications documentées">
        Des articles sourcés et datés pour comprendre l'essentiel. Le contrôle réalisé par l'IA, ou la validation humaine, est précisé sur chaque publication.
      </PageIntro>
      {publishedArticles.length ? (
        <>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-b border-night/10 pb-4">
            <p className="text-sm font-semibold text-night">{publishedArticles.length} publication{publishedArticles.length > 1 ? "s" : ""} disponible{publishedArticles.length > 1 ? "s" : ""}</p>
            <Link href="/explorer/" className="rounded-full border border-night/15 bg-paper px-4 py-2 text-sm font-semibold text-blue-ink transition hover:border-blue-ink hover:bg-blue/5">Rechercher un sujet ↗</Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {publishedArticles.map((p, i) => <PublicationTile key={p.slug} publication={p} featured={i === 0} />)}
          </div>
          <p className="mt-8 max-w-2xl text-xs leading-relaxed text-muted">
            Les photographies servent à illustrer un domaine ; elles ne constituent pas une preuve visuelle de l'événement décrit. Retrouvez les sources et les crédits des médias dans chaque publication.
          </p>
        </>
      ) : (
        <section className="mt-10 rounded-3xl border border-night/10 bg-paper p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-ink">Rédaction en préparation</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-night">Les prochains récits sourcés paraîtront ici.</h2>
          <p className="mt-3 max-w-xl text-muted">Les brouillons non validés restent privés. Chaque publication précise son type de vérification.</p>
          <Link href="/explorer/" className="mt-6 inline-flex rounded-full bg-night px-5 py-3 text-sm font-semibold text-ivory">Explorer les démonstrations</Link>
        </section>
      )}
    </div>
  );
}
