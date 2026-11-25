import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { PublicationTile } from "@/components/PublicationTile";
import { HomeRow } from "@/components/home/HomeRow";
import { byMonth, toHomeItem } from "@/lib/home";
import { verifiedPublications as publishedArticles } from "@/lib/verified";

export const metadata: Metadata = { title: "Publications documentées" };

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-[calc(var(--nav-h)+3rem)] pt-8 md:px-8 md:pb-20 md:pt-12">
      <PageIntro title="Publications">
        L&apos;archive de MUNDI : toutes les publications, de la plus récente à la plus ancienne, classées par mois. Le contrôle réalisé par l&apos;IA, ou la validation humaine, est précisé sur chaque publication.
      </PageIntro>
      {publishedArticles.length ? (
        <>
          <p className="mt-4 text-sm text-muted">
            <span className="font-mono">{publishedArticles.length}</span> publication{publishedArticles.length > 1 ? "s" : ""}, de la plus récente à la plus ancienne ·{" "}
            <Link href="/explorer/" className="font-semibold text-accent underline-offset-4 hover:underline">Rechercher un sujet</Link>
          </p>
          <div className="mt-8">
            <PublicationTile publication={publishedArticles[0]} featured />
          </div>
          {/* Archive chronologique : blocs par mois, lignes compactes sans image. */}
          {byMonth(publishedArticles.slice(1)).map((month) => (
            <section key={month.key} aria-labelledby={`mois-${month.key}`} className="mt-10" data-testid="archive-month">
              <h2 id={`mois-${month.key}`} className="border-b border-ink pb-2 font-display text-intertitre font-semibold text-ink">
                {month.label} <span className="font-mono text-sm font-normal text-muted">({month.items.length})</span>
              </h2>
              <ul className="grid md:grid-cols-2 md:gap-x-8">
                {month.items.map((p) => <HomeRow key={p.slug} item={toHomeItem(p)} testId="archive-item" />)}
              </ul>
            </section>
          ))}
          <p className="mt-10 max-w-2xl border-t border-rule pt-4 text-meta leading-relaxed text-muted">
            Les photographies servent à illustrer un domaine ; elles ne constituent pas une preuve visuelle de l&apos;événement décrit. Retrouvez les sources et les crédits des médias dans chaque publication.
          </p>
        </>
      ) : (
        <section className="mt-10 border-t border-ink pt-6">
          <h2 className="mt-3 font-display text-3xl font-semibold text-ink">Les prochains récits sourcés paraîtront ici.</h2>
          <p className="mt-3 max-w-xl text-muted">Les brouillons non validés restent privés. Chaque publication précise son type de vérification.</p>
          <Link href="/explorer/" className="btn btn-primary mt-6">Explorer les démonstrations</Link>
        </section>
      )}
    </div>
  );
}
