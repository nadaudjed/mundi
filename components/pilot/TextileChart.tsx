import type { DecryptageVisual } from "@/lib/decryptage";

type Chart = Extract<DecryptageVisual, { type: "graphique" }>;
const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const SHADES = ["bg-brick", "bg-graphite-2", "bg-[#9aa0a8]"];

/**
 * Graphique du démonstrateur « déchets textiles » : deux volumes annuels sur une échelle
 * commune, puis la répartition des SEULS déchets traités. Le dénominateur est écrit en toutes
 * lettres sous la seconde barre : c'est tout l'enjeu du sujet.
 * HTML et CSS seulement (lisible par les lecteurs d'écran via la figure et sa description).
 */
export function TextileChart({ visual: v, compact = false }: { visual: Chart; compact?: boolean }) {
  const max = Math.max(...v.bars.map((b) => b.value));
  return (
    <div
      role="img"
      aria-label={v.alt}
      data-testid="decryptage-visual"
      data-visual="graphique"
      className={`flex flex-col justify-center bg-ivory text-graphite ${compact ? "absolute inset-0 gap-2 px-5 py-3 wide:gap-4 wide:pl-10 wide:pr-24 md:pr-20" : "gap-4 border border-rule p-5 md:p-7"}`}
    >
      {!compact && <p className="font-serif text-[1.45rem] leading-tight">{v.title}</p>}
      <div className={compact ? "space-y-1.5" : "space-y-3"}>
        {v.bars.map((b) => (
          <div key={b.label}>
            <div className="flex items-baseline justify-between gap-3 text-[0.78rem]">
              <span className="font-medium">{b.label}</span>
              <span className="font-mono font-semibold">{fmt(b.value)} {b.unit}</span>
            </div>
            <div className={`mt-1 bg-ivory-2 ${compact ? "h-2.5" : "h-4"}`}>
              <div className="h-full bg-graphite" style={{ width: `${(b.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      {v.split && (
        <div className={compact ? "mt-1" : "mt-2 border-t border-rule pt-4"}>
          <p className="text-[0.78rem] font-semibold">{v.split.label}</p>
          <div className={`mt-1 flex overflow-hidden ${compact ? "h-4" : "h-6"}`}>
            {v.split.parts.map((part, i) => (
              <div key={part.label} className={`${SHADES[i] ?? SHADES[2]} flex items-center justify-center text-[0.7rem] font-semibold text-white`} style={{ width: `${part.value}%` }}>
                {part.value >= 10 ? `${part.value} %` : ""}
              </div>
            ))}
          </div>
          <ul className={`mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.72rem] ${compact ? "max-[359px]:hidden" : ""}`}>
            {v.split.parts.map((part, i) => (
              <li key={part.label} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`inline-block size-2.5 ${SHADES[i] ?? SHADES[2]}`} />
                {part.label} {part.value} %
              </li>
            ))}
          </ul>
          {!compact && v.split.parts.some((p) => p.note) && (
            <p className="mt-2 text-[0.75rem] leading-relaxed text-graphite-2">
              {v.split.parts.filter((p) => p.note).map((p) => `${p.label} : ${p.note}`).join(" ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
