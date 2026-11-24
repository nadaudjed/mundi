"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Graphique SVG maison (barres ou courbe), sans bibliothèque.
 *
 * Format attendu — rien n'est calculé ni inventé, seules ces valeurs sont tracées :
 *   {
 *     title:  "Déchets textiles dans l'UE",         // ce que montre le graphique
 *     unit:   "millions de tonnes",                  // unité commune à tous les points
 *     period: "2024",                                // période couverte
 *     source: { label: "Eurostat", url: "https://…" }, // ou un texte pour les démonstrations
 *     points: [{ label: "Générés", value: 2.3 }, …],   // 2 à 12 points, même unité, même dénominateur
 *     type:   "barres" | "courbe"                    // « courbe » seulement pour une série dans le temps
 *   }
 * Sans série de ce type dans le contenu, aucun graphique n'est affiché.
 *
 * Le tracé est progressif à l'entrée dans l'écran, sauf si le lecteur a demandé
 * de réduire les animations (prefers-reduced-motion) : le graphique est alors complet d'emblée.
 */
export type ChartPoint = { label: string; value: number };
export type ChartProps = {
  title: string;
  unit: string;
  period: string;
  source: { label: string; url?: string };
  points: ChartPoint[];
  type?: "barres" | "courbe";
  decimals?: number;
  note?: string;
};

const H = 240;
const TOP = 24;
const BOTTOM = 28;

export function Chart({ title, unit, period, source, points, type = "barres", decimals, note }: ChartProps) {
  const ref = useRef<HTMLElement>(null);
  // Rendu serveur et sans JavaScript : graphique complet. Il n'est masqué puis tracé
  // que s'il est encore hors de l'écran au chargement.
  // Largeur réelle en pixels : le texte du graphique garde sa taille sur téléphone comme sur ordinateur.
  const [W, setW] = useState(560);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setW(Math.round(Math.min(640, Math.max(260, entry.contentRect.width)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [state, setState] = useState<"complet" | "attente" | "trace">("complet");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return;
    const hide = requestAnimationFrame(() => setState("attente"));
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("trace");
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      cancelAnimationFrame(hide);
      io.disconnect();
    };
  }, []);

  if (points.length < 2) return null;
  const fmt = (v: number) => v.toLocaleString("fr-FR", decimals === undefined ? undefined : { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const max = Math.max(...points.map((p) => p.value), 0);
  const min = Math.min(...points.map((p) => p.value), 0);
  const span = max - min || 1;
  const plotH = H - TOP - BOTTOM;
  const y = (v: number) => TOP + plotH - ((v - min) / span) * plotH;
  const baseY = y(0);
  const summary = `${title}, en ${unit}, ${period}. ${points.map((p) => `${p.label} : ${fmt(p.value)}`).join(" ; ")}. Source : ${source.label}.`;

  let marks: React.ReactNode;
  if (type === "courbe") {
    const pad = 14;
    const x = (i: number) => pad + i * ((W - pad * 2) / (points.length - 1));
    const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
    marks = (
      <>
        <path d={d} pathLength={1} className="chart-line" fill="none" stroke="currentColor" strokeWidth={2} />
        {points.map((p, i) => {
          const last = i === points.length - 1;
          return (
            <g key={p.label}>
              <circle cx={x(i)} cy={y(p.value)} r={last ? 4.5 : 3} className={last ? "fill-accent" : "fill-current"} />
              {(last || i === 0) && (
                <text x={x(i)} y={y(p.value) - 10} textAnchor={last ? "end" : "start"} className="chart-value">
                  {fmt(p.value)}
                </text>
              )}
              <text x={x(i)} y={H - 8} textAnchor="middle" className="chart-label">
                {p.label}
              </text>
            </g>
          );
        })}
      </>
    );
  } else {
    const gap = 32;
    const bw = Math.min(170, (W - gap * (points.length - 1)) / points.length);
    marks = points.map((p, i) => {
      const x = i * (bw + gap);
      const top = Math.min(y(p.value), baseY);
      const h = Math.abs(baseY - y(p.value));
      return (
        <g key={p.label}>
          <rect x={x} y={top} width={bw} height={h} className="chart-bar fill-current" style={{ transitionDelay: `${i * 80}ms` }} />
          <text x={x + bw / 2} y={top - 8} textAnchor="middle" className="chart-value">
            {fmt(p.value)}
          </text>
          <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="chart-label">
            {p.label}
          </text>
        </g>
      );
    });
  }

  return (
    <figure ref={ref} className="chart border-y border-rule py-5 text-ink" data-chart={type} data-drawn={state === "attente" ? "false" : "true"} data-testid="chart">
      <figcaption>
        <p className="font-display text-xl font-semibold">{title}</p>
        <p className="mt-1 text-meta text-muted">
          En {unit} · <span className="font-mono">{period}</span>
        </p>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full max-w-[640px] overflow-visible" role="img" aria-label={summary}>
        <line x1="0" x2={W} y1={baseY} y2={baseY} className="stroke-rule-strong" strokeWidth={1} />
        {marks}
      </svg>
      <p className="mt-3 text-meta text-muted">
        Source :{" "}
        {source.url ? (
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
            {source.label}
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        ) : (
          source.label
        )}
        {note && <> · {note}</>}
      </p>
    </figure>
  );
}
