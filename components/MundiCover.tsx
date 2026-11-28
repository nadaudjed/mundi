import { coverOf, type Cover, type CoverHint } from "@/lib/covers";
import type { DataCard } from "@/lib/data-cards";
import { formatValue } from "@/lib/data-cards";
import { KIND_LABEL, publicationKind, type PublicationKind } from "@/lib/publication-kind";
import { getTopic } from "@/lib/topics";
import type { ReactNode } from "react";
import type { VisualPattern } from "@/lib/types";

/**
 * Couverture MUNDI d'une publication sans photo pertinente (ticket 136).
 * Une composition de magazine (ivoire, graphite, rouge MUNDI, couleur de la rubrique) :
 * chiffre clé sourcé, année d'un récit, motif d'un concept ou composition typographique.
 * Rendu en HTML et SVG en ligne : aucune image à télécharger, aucune génération.
 * Purement décorative pour les lecteurs d'écran : le sens est porté par le titre et le texte.
 */
type Coverable = { slug: string; title: string; topic: string; kind?: PublicationKind; dataCards?: DataCard[]; cover?: CoverHint };

export type CoverTone = "night" | "paper" | "page";

const TONES: Record<CoverTone, { box: string; bg: string; accent: string; muted: string; rule: string; motif: number }> = {
  night: { box: "bg-night-2 text-ivory", bg: "bg-night-2", accent: "text-brick-light", muted: "text-ivory/75", rule: "border-ivory/25", motif: 0.6 },
  paper: { box: "bg-ivory-2 text-graphite", bg: "bg-ivory-2", accent: "text-brick", muted: "text-graphite-2", rule: "border-graphite/25", motif: 0.75 },
  page: { box: "bg-surface text-ink", bg: "bg-surface", accent: "text-accent", muted: "text-muted", rule: "border-rule-strong", motif: 0.7 },
};

/** Cadrage du motif selon la variation stable : à droite, en bas à gauche, ou en haut. */
const FRAMING = ["xMaxYMid slice", "xMinYMax slice", "xMidYMin slice"] as const;

export function MundiCover({ publication: p, tone = "night", size = "lg", className = "" }: {
  publication: Coverable; tone?: CoverTone; size?: "lg" | "compact"; className?: string;
}) {
  const cover = coverOf(p);
  const topic = getTopic(p.topic);
  const t = TONES[tone];
  const color = topic?.color ?? "#e07a5f";
  const kicker = `${KIND_LABEL[publicationKind(p)]} · ${topic?.name ?? ""}`;
  return (
    <div
      aria-hidden="true"
      data-visual="couverture"
      data-cover={cover.treatment}
      data-variant={cover.variant}
      className={`@container overflow-hidden ${t.box} ${className}`}
    >
      <Motif pattern={topic?.pattern ?? "rings"} color={color} opacity={cover.treatment === "chiffre" ? t.motif * 0.45 : t.motif} variant={cover.variant} />
      <div className="relative flex h-full flex-col justify-between p-[6%]">
        {cover.treatment === "date" && <span className={`pointer-events-none absolute inset-[3%] border ${t.rule}`} />}
        <p className={`flex w-fit max-w-full items-center gap-2 py-0.5 pr-1.5 ${t.bg} font-mono text-[clamp(0.6rem,2.6cqi,0.8rem)] tracking-[0.14em] uppercase`}>
          <span className="inline-block shrink-0 h-[0.35em] w-[1.8em] bg-brick" />
          <span className={`truncate ${t.muted}`}>{kicker}</span>
        </p>
        <Focal cover={cover} tone={t} size={size} />
      </div>
    </div>
  );
}

function Focal({ cover, tone, size }: { cover: Cover; tone: (typeof TONES)[CoverTone]; size: "lg" | "compact" }) {
  if (cover.treatment === "chiffre" && cover.figure) {
    const m = cover.figure.measure;
    return (
      <div className="min-w-0">
        <p className="leading-[0.9]">
          <span className={`font-display text-[clamp(2.2rem,19cqi,8rem)] font-semibold tracking-[-0.03em] tabular-nums ${tone.accent}`}>{formatValue(m)}</span>
          <span className="ml-[0.3em] font-display text-[clamp(0.9rem,5.5cqi,2rem)] font-semibold">{m.unit}</span>
        </p>
        {size === "lg" && (
          <p className={`mt-[0.6em] line-clamp-2 max-w-[34em] text-[clamp(0.7rem,3.2cqi,0.95rem)] leading-snug ${tone.muted}`}>
            {m.label} · {m.scope} · {m.period} · Source : {cover.figure.source.label}
          </p>
        )}
      </div>
    );
  }
  if (cover.treatment === "date" && cover.date) {
    return (
      <p className="font-display text-[clamp(2.6rem,24cqi,10rem)] leading-[0.85] font-semibold tracking-[-0.04em] tabular-nums" data-testid="cover-date">
        {cover.date}
      </p>
    );
  }
  if (cover.word) {
    return <p className="font-display text-[clamp(1.6rem,15cqi,6.5rem)] leading-[0.9] font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]">{cover.word}</p>;
  }
  return <span />;
}

/* ---------- Motifs abstraits de rubrique (décoratifs, jamais des données) ---------- */

const W = 300;
const H = 200;

function Motif({ pattern, color, opacity, variant }: { pattern: VisualPattern; color: string; opacity: number; variant: 0 | 1 | 2 }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio={FRAMING[variant]}
      className="pointer-events-none absolute inset-0 h-full w-full"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      color={color}
      opacity={opacity}
      data-motif={pattern}
    >
      {MOTIFS[pattern](variant)}
    </svg>
  );
}

const MOTIFS: Record<VisualPattern, (v: number) => ReactNode> = {
  /** Étapes et nœuds : un trajet qui relie des points (traçabilité, échanges). */
  routes: (v) => {
    const pts = [[150, 170], [190, 120], [245, 135], [230, 70], [280, 40], [205, 25]].map(([x, y]) => [x - v * 10, y]);
    return (
      <>
        <polyline points={pts.map((q) => q.join(",")).join(" ")} />
        <polyline points={`${pts[1].join(",")} 140,60 ${pts[5].join(",")}`} strokeDasharray="5 6" />
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 5 : 8} fill="currentColor" fillOpacity={i === 0 ? 1 : 0} />)}
      </>
    );
  },
  /** Ondes parallèles (flux, marchés, énergie). */
  waves: (v) => (
    <>
      {Array.from({ length: 7 }, (_, i) => {
        const y = 40 + i * 20;
        const a = 12 + ((i + v) % 3) * 4;
        return <path key={i} d={`M120 ${y} C160 ${y - a} 190 ${y + a} 230 ${y} S290 ${y - a} 330 ${y}`} />;
      })}
    </>
  ),
  /** Formes imbriquées (organisation, production). */
  grid: (v) => (
    <>
      {Array.from({ length: 5 }, (_, i) => {
        const s = 150 - i * 26;
        return <rect key={i} x={260 - s + i * (v + 2) * 3} y={100 - s / 2} width={s} height={s} transform={`rotate(${(i - 2) * 4} 210 100)`} />;
      })}
    </>
  ),
  /** Anneaux concentriques décentrés (ressources, gisements). */
  rings: (v) => (
    <>
      {Array.from({ length: 7 }, (_, i) => <circle key={i} cx={235 - v * 15} cy={110} r={14 + i * 17} />)}
    </>
  ),
  /** Boucles enchaînées (réemploi, cycles). */
  orbits: (v) => (
    <>
      {[0, 1, 2].map((i) => <ellipse key={i} cx={175 + i * 45} cy={100 + (i % 2 ? -18 : 18) * (v === 1 ? -1 : 1)} rx={44} ry={44} />)}
      <ellipse cx={220} cy={100} rx={110} ry={70} strokeDasharray="3 7" />
    </>
  ),
  /** Arcs superposés : un rythme, sans ressembler à un graphique. */
  bars: (v) => (
    <>
      {Array.from({ length: 6 }, (_, i) => {
        const r = 34 + i * 30;
        const cx = 300 - v * 20;
        return <path key={i} d={`M${cx - r} 200 A ${r} ${r} 0 0 1 ${cx} ${200 - r}`} />;
      })}
    </>
  ),
};
