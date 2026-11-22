import type { ChartData } from "@/lib/types";

/** Graphique en barres accessible, avec unité, période et origine visibles. */
export function MiniChart({ chart, color }: { chart: ChartData; color: string }) {
  const max = Math.max(...chart.points.map((p) => p.value));
  const W = 320;
  const H = 160;
  const gap = 6;
  const bw = (W - gap * (chart.points.length - 1)) / chart.points.length;

  return (
    <figure className="rounded-3xl bg-night p-5 text-ivory md:p-6">
      <figcaption className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#ffd98f]">{chart.origin}</p>
        <p className="mt-1 font-display text-xl font-semibold">{chart.title}</p>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label={`${chart.title}, en ${chart.unit}, ${chart.period}. ${chart.origin}.`}>
        <line x1="0" x2={W} y1={H} y2={H} stroke="rgba(243,240,232,0.3)" />
        {chart.points.map((p, i) => {
          const h = (p.value / max) * (H - 18);
          const x = i * (bw + gap);
          return (
            <g key={p.label}>
              <rect x={x} y={H - h} width={bw} height={h} rx={4} fill={color} opacity={0.45 + (i / chart.points.length) * 0.55} />
              <text x={x + bw / 2} y={H - h - 5} textAnchor="middle" fontSize="9" fill="rgba(243,240,232,0.85)">
                {p.value.toLocaleString("fr-FR")}
              </text>
              <text x={x + bw / 2} y={H + 15} textAnchor="middle" fontSize="9" fill="rgba(243,240,232,0.6)">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-ivory/15 pt-4 text-xs">
        <div>
          <dt className="text-ivory/55">Unité</dt>
          <dd className="mt-0.5 font-medium">{chart.unit}</dd>
        </div>
        <div>
          <dt className="text-ivory/55">Période</dt>
          <dd className="mt-0.5 font-medium">{chart.period}</dd>
        </div>
        <div>
          <dt className="text-ivory/55">Origine</dt>
          <dd className="mt-0.5 font-medium">{chart.origin}</dd>
        </div>
      </dl>
    </figure>
  );
}
