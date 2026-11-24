import { describeMeasure, formatValue } from "@/lib/data-cards";
import type { KeyFigure as KeyFigureData } from "@/lib/covers";
import { formatDate } from "@/lib/format";

/**
 * Chiffre clé en couverture, à la place de la photo d'illustration.
 * La valeur, son unité, son périmètre, sa période et sa source restent visibles.
 */
export function KeyFigure({ figure, size = "lg", tone = "page" }: { figure: KeyFigureData; size?: "lg" | "md"; tone?: "page" | "night" }) {
  const m = figure.measure;
  const big = size === "lg" ? "text-[clamp(4rem,3rem+7vw,9rem)]" : "text-[clamp(3rem,2.4rem+4vw,5.5rem)]";
  const colors = tone === "night" ? "bg-night text-ivory" : "bg-surface text-ink";
  const muted = tone === "night" ? "text-ivory/75" : "text-muted";
  return (
    <figure className={`border-y border-rule py-6 ${colors}`} data-testid="key-figure">
      <p className="sr-only">{describeMeasure(m)}</p>
      <p aria-hidden="true" className="px-1">
        <span className={`font-display ${big} leading-[0.9] font-semibold tracking-[-0.03em] text-accent tabular-nums`}>{formatValue(m)}</span>{" "}
        <span className="font-display text-xl font-semibold md:text-2xl">{m.unit}</span>
      </p>
      <figcaption className={`mt-3 px-1 text-sm leading-snug ${muted}`}>
        <span aria-hidden="true">
          {m.label}
          {m.denominator && <> {m.denominator}</>} · {m.scope} · {m.period}
        </span>
        <span className="mt-1 block font-mono text-meta">
          Source :{" "}
          <a href={figure.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-accent">
            {figure.source.label}
          </a>{" "}
          · données du <time dateTime={figure.asOf}>{formatDate(figure.asOf)}</time>
        </span>
      </figcaption>
    </figure>
  );
}
