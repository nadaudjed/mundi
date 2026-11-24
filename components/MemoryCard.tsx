import Link from "next/link";

/**
 * Fin d'article : les trois idées à retenir sous forme de carte mémoire,
 * avec un lien vers « Réviser » (la progression reste sur l'appareil).
 */
export function MemoryCard({ points, note }: { points: string[]; note?: string }) {
  return (
    <section aria-labelledby="carte-memoire" className="mt-14 rounded-md border border-rule-strong bg-surface p-5 md:p-7" data-testid="memory-card">
      <p className="text-meta text-muted">Carte mémoire</p>
      <h2 id="carte-memoire" className="mt-1 font-display text-intertitre font-semibold text-ink">
        Trois idées à retenir
      </h2>
      <ol className="mt-3">
        {points.slice(0, 3).map((point, i) => (
          <li key={i} className="flex gap-4 border-t border-rule py-3 leading-relaxed text-ink">
            <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
            <span>{point}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule pt-4 text-sm text-muted">
        <Link href="/reviser/" className="btn btn-primary">
          Réviser ces idées
        </Link>
        <span>{note ?? "Elles reviendront dans « Réviser » au bon moment pour les retenir."}</span>
      </p>
    </section>
  );
}
