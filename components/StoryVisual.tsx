import type { VisualPattern } from "@/lib/types";

/**
 * Visuels génératifs abstraits : aucune image externe, donc aucun problème
 * de droits. Chaque sujet a son motif ; la graine (slug) varie les détails.
 */

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

type Props = {
  pattern: VisualPattern;
  color: string;
  seed: string;
  className?: string;
};

export function StoryVisual({ pattern, color, seed, className = "" }: Props) {
  const r = rng(hash(seed));
  const id = `v-${hash(seed).toString(36)}`;

  return (
    <svg
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${id}-glow`} cx={0.3 + r() * 0.4} cy={0.3 + r() * 0.3} r="0.75">
          <stop offset="0" stopColor={color} stopOpacity="0.55" />
          <stop offset="0.55" stopColor={color} stopOpacity="0.12" />
          <stop offset="1" stopColor="#101D30" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-line`} x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.1" />
          <stop offset="0.5" stopColor={color} stopOpacity="0.9" />
          <stop offset="1" stopColor="#20B99A" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="#101D30" />
      <rect width="400" height="400" fill={`url(#${id}-glow)`} />
      <g stroke={`url(#${id}-line)`} fill="none">{renderPattern(pattern, r, color)}</g>
    </svg>
  );
}

function renderPattern(pattern: VisualPattern, r: () => number, color: string) {
  switch (pattern) {
    case "orbits": {
      const cx = 200 + (r() - 0.5) * 60;
      const cy = 190 + (r() - 0.5) * 60;
      return (
        <g className="origin-center motion-safe:animate-[spin_90s_linear_infinite]" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          {Array.from({ length: 6 }, (_, i) => (
            <ellipse
              key={i}
              cx={cx}
              cy={cy}
              rx={40 + i * 28}
              ry={22 + i * 16}
              transform={`rotate(${i * 24 + r() * 20} ${cx} ${cy})`}
              strokeWidth={1.2}
              opacity={0.9 - i * 0.1}
            />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <circle key={`p${i}`} cx={cx + (r() - 0.5) * 260} cy={cy + (r() - 0.5) * 160} r={2 + r() * 4} fill={color} stroke="none" />
          ))}
        </g>
      );
    }
    case "waves":
      return Array.from({ length: 14 }, (_, i) => {
        const y = 60 + i * 22;
        const a = 12 + r() * 26;
        const p = r() * 200;
        const d = `M -20 ${y} C ${80 + p / 4} ${y - a}, ${160 + p / 4} ${y + a}, 220 ${y} S ${360 - p / 6} ${y - a}, 420 ${y}`;
        return <path key={i} d={d} strokeWidth={1.4} opacity={0.25 + (i / 14) * 0.7} />;
      });
    case "grid": {
      const cells = [];
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const v = r();
          if (v > 0.55) {
            cells.push(
              <rect key={`${x}-${y}`} x={x * 40 + 8} y={y * 40 + 8} width={24} height={24} rx={4} strokeWidth={1.2} opacity={v} fill={v > 0.9 ? color : "none"} fillOpacity={0.35} />,
            );
          }
        }
      }
      return <>{cells}</>;
    }
    case "routes": {
      const nodes = Array.from({ length: 9 }, () => ({ x: 30 + r() * 340, y: 40 + r() * 300 }));
      return (
        <>
          {nodes.slice(1).map((n, i) => {
            const m = nodes[i];
            const cx = (m.x + n.x) / 2 + (r() - 0.5) * 120;
            const cy = (m.y + n.y) / 2 - 40 - r() * 60;
            return <path key={i} d={`M ${m.x} ${m.y} Q ${cx} ${cy} ${n.x} ${n.y}`} strokeWidth={1.4} strokeDasharray="4 6" />;
          })}
          {nodes.map((n, i) => (
            <g key={`n${i}`}>
              <circle cx={n.x} cy={n.y} r={9} strokeWidth={1} opacity={0.5} />
              <circle cx={n.x} cy={n.y} r={3.5} fill={color} stroke="none" />
            </g>
          ))}
        </>
      );
    }
    case "bars":
      return Array.from({ length: 12 }, (_, i) => {
        const h = 60 + r() * 220 + i * 6;
        return <rect key={i} x={20 + i * 31} y={360 - h} width={16} height={h} rx={8} strokeWidth={1.3} opacity={0.35 + (i / 12) * 0.6} />;
      });
    case "rings": {
      const cx = 200 + (r() - 0.5) * 80;
      const cy = 200 + (r() - 0.5) * 80;
      return (
        <>
          {Array.from({ length: 9 }, (_, i) => (
            <circle key={i} cx={cx} cy={cy} r={18 + i * 24} strokeWidth={1.2} strokeDasharray={i % 2 ? "2 8" : undefined} opacity={1 - i * 0.09} />
          ))}
          {Array.from({ length: 6 }, (_, i) => {
            const a = r() * Math.PI * 2;
            const d = 40 + r() * 180;
            return <circle key={`d${i}`} cx={cx + Math.cos(a) * d} cy={cy + Math.sin(a) * d} r={3 + r() * 3} fill={color} stroke="none" />;
          })}
        </>
      );
    }
  }
}
