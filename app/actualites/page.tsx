import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { formatDate } from "@/lib/format";
import { verifiedPublications as publishedArticles } from "@/lib/verified";
import { getTopic } from "@/lib/topics";

export const metadata: Metadata = { title: "Publications vérifiées" };

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-8 pb-[calc(var(--nav-h)+3rem)] md:px-8 md:pt-12 md:pb-20">
      <PageIntro eyebrow="Rédaction MUNDI" title="Les publications vérifiées">
        Des récits sourcés, datés et relus avant publication. Les démonstrations sont séparées.
      </PageIntro>
      {publishedArticles.length > 0 ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {publishedArticles.map(a => (
            <Link key={a.slug} href={"/actualites/" + a.slug + "/"} className="group rounded-3xl border border-night/10 bg-paper p-6 hover:border-blue/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-ink">{getTopic(a.topic)?.name} · Vérifié</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-night group-hover:text-blue">{a.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{a.summary}</p>
              <p className="mt-5 text-xs text-muted">{a.fixture ? "Exemple de test · " : ""}Publié le <time dateTime={a.publishedAt}>{formatDate(a.publishedAt)}</time> · {a.sources.length} sources</p>
            </Link>
          ))}
        </div>
      ) : (
        <section className="mt-10 rounded-3xl border border-night/10 bg-paper p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue">Rédaction en préparation</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-night">Les premiers récits vérifiés seront publiés ici.</h2>
          <p className="mt-3 max-w-xl text-muted">Aucune actualité générée par IA ne sera publiée sans vérification humaine de ses faits et sources.</p>
          <Link href="/explorer/" className="mt-6 inline-flex rounded-full bg-night px-5 py-3 text-sm font-semibold text-ivory">Explorer les démonstrations</Link>
        </section>
      )}
    </div>
  );
}
