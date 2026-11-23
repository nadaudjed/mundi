import Link from "next/link";
import type { ReactNode } from "react";
import {
  describeMeasure,
  formatValue,
  type ComparisonCard,
  type DataCard,
  type DataCardStyle,
  type ExplanationCard,
  type ExplanationStep,
  type Measure,
  type StatCard,
  type VisualSlot,
} from "@/lib/data-cards";
import { formatDate } from "@/lib/format";
import { inkOn, luminance } from "@/lib/topics";
import { Icon } from "../Icon";

/**
 * Affichage d'une carte de données (ticket #25).
 *
 * Structure technique uniquement : hiérarchie, accessibilité, animation
 * facultative et emplacement de visuel. La direction artistique (ticket #26,
 * ChatGPT) s'applique via `style` (jetons de marque) et `visual` (fichiers
 * originaux fournis). Aucune valeur n'est calculée ni arrondie en douce :
 * seules les barres d'une « échelle commune » sont proportionnelles aux
 * valeurs fournies.
 */

const ACCENTS = { mint: "#20B99A", blue: "#5B93E0", amber: "#E0A43A" } as const;

type Status = "verifie" | "brouillon";

type Props = {
  card: DataCard;
  position: number;
  total: number;
  /** Couleur du sujet, utilisée si `style.accent` vaut « topic ». */
  topicColor: string;
  /** Lance l'animation d'apparition (seulement si l'appareil l'autorise). */
  active: boolean;
  status: Status;
  /** Lien « Comprendre » vers la publication complète (absent en brouillon). */
  href?: string;
  /** Afficher un cadre d'attente quand aucun visuel n'est fourni (atelier uniquement). */
  showVisualPlaceholder?: boolean;
};

function accentOf(style: DataCardStyle | undefined, topicColor: string) {
  const a = style?.accent ?? "mint";
  return a === "topic" ? topicColor : ACCENTS[a];
}

/** Couleur d'accent utilisable pour du TEXTE sur fond nuit : sinon ivoire (contraste AA 4,5:1). */
function textAccentOnNight(color: string) {
  const ratio = (luminance(color) + 0.05) / (luminance("#101D30") + 0.05);
  return ratio >= 4.5 ? color : "#F3F0E8";
}

export function DataCardView({ card, position, total, topicColor, active, status, href, showVisualPlaceholder = false }: Props) {
  const light = card.style?.tone === "ivory";
  const accent = accentOf(card.style, topicColor);
  const textAccent = light ? undefined : textAccentOnNight(accent);
  const display = card.style?.emphasis !== "sans";
  const titleId = `data-${card.id}-title`;

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden px-5 pt-28 pb-6 md:px-6 md:pt-20 ${light ? "bg-ivory text-night" : "bg-night text-ivory"}`}
      data-card-kind={card.kind}
      data-tone={light ? "ivory" : "night"}
      aria-labelledby={titleId}
      role="group"
    >
      <div className="flex items-center justify-between gap-3 text-[0.7rem] font-bold uppercase tracking-[0.18em]">
        <span style={{ color: textAccent }} className={light ? "text-night/70" : ""}>
          Données · carte {position + 1} sur {total}
        </span>
        {status === "brouillon" && (
          <span className={`rounded-full border-2 border-dashed border-amber px-2 py-0.5 text-[0.65rem] ${light ? "text-[#7a5410]" : "text-[#ffd98f]"}`}>
            Brouillon — non publié
          </span>
        )}
      </div>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i <= position ? "" : light ? "bg-night/15" : "bg-ivory/20"}`} style={i <= position ? { background: accent } : undefined} />
        ))}
      </div>

      <h2 id={titleId} className={`mt-5 text-balance ${display ? "font-display text-[1.6rem] leading-[1.15]" : "text-[1.4rem] leading-snug"} font-semibold`}>
        {card.headline}
      </h2>

      <VisualArea visual={card.visual} placeholder={showVisualPlaceholder} light={light} />

      <div className="mt-auto pt-4">
        {card.kind === "stat" && <StatBody card={card} accent={textAccent} active={active} display={display} light={light} />}
        {card.kind === "comparaison" && <ComparisonBody card={card} accent={accent} active={active} light={light} />}
        {card.kind === "explication" && <ExplanationBody card={card} accent={accent} light={light} />}
        <Footer card={card} light={light} href={href} />
      </div>
    </div>
  );
}

function VisualArea({ visual, placeholder, light }: { visual?: VisualSlot; placeholder: boolean; light: boolean }) {
  if (visual) {
    return (
      <figure className="mt-4 min-h-0 flex-1" data-testid="data-visual">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={visual.src}
          alt={visual.decorative ? "" : visual.alt}
          aria-hidden={visual.decorative ? true : undefined}
          className="h-full max-h-56 w-full object-contain"
          loading="lazy"
          decoding="async"
        />
        <figcaption className={`mt-1 text-[0.65rem] ${light ? "text-night/70" : "text-ivory/70"}`}>
          Visuel : {visual.credit} · {visual.license}
        </figcaption>
      </figure>
    );
  }
  if (!placeholder) return null;
  return (
    <div
      className={`mt-4 flex min-h-24 flex-1 items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center text-xs ${light ? "border-night/25 text-night/70" : "border-ivory/25 text-ivory/70"}`}
      data-testid="data-visual-placeholder"
    >
      Emplacement du visuel : fourni par la direction artistique (facultatif)
    </div>
  );
}

function Value({ m, display, big }: { m: Measure; display: boolean; big?: boolean }) {
  return (
    <span className="whitespace-nowrap">
      <span className={`${display ? "font-display" : ""} ${big ? "text-[3.4rem] leading-none" : "text-2xl"} font-semibold tabular-nums`}>{formatValue(m)}</span>{" "}
      <span className={big ? "text-lg font-semibold" : "text-sm font-semibold"}>{m.unit}</span>
    </span>
  );
}

function Context({ m, light }: { m: Measure; light: boolean }) {
  return (
    <span className={`block text-sm leading-snug ${light ? "text-night/80" : "text-ivory/80"}`}>
      {m.label}
      {m.denominator && <> {m.denominator}</>} · {m.scope} · <strong className="font-semibold">{m.period}</strong>
    </span>
  );
}

function StatBody({ card, accent, active, display, light }: { card: StatCard; accent?: string; active: boolean; display: boolean; light: boolean }) {
  return (
    <div data-testid="stat-value">
      <p className="sr-only">{describeMeasure(card.measure)}</p>
      <div aria-hidden="true" className={active ? "motion-safe:animate-rise" : ""}>
        <span style={{ color: accent }}>
          <Value m={card.measure} display={display} big />
        </span>
        <span className="mt-2 block">
          <Context m={card.measure} light={light} />
        </span>
      </div>
      {card.context && <p className={`mt-3 text-[0.95rem] leading-relaxed ${light ? "text-night/85" : "text-ivory/85"}`}>{card.context}</p>}
    </div>
  );
}

function ComparisonBody({ card, accent, active, light }: { card: ComparisonCard; accent: string; active: boolean; light: boolean }) {
  const common = card.presentation === "echelle-commune";
  const max = Math.max(...card.items.map((m) => m.value), 0);
  return (
    <div data-testid="comparison" data-presentation={card.presentation}>
      <ul className="space-y-3">
        {card.items.map((m, i) => (
          <li key={i}>
            <p className="sr-only">{describeMeasure(m)}</p>
            <div aria-hidden="true">
              <Value m={m} display={false} />
              <Context m={m} light={light} />
              {common && max > 0 && (
                <span className={`mt-1.5 block h-2.5 w-full overflow-hidden rounded-full ${light ? "bg-night/10" : "bg-ivory/10"}`}>
                  <span
                    className={`block h-full origin-left rounded-full ${active ? "motion-safe:animate-grow-x" : ""}`}
                    style={{ width: `${(m.value / max) * 100}%`, background: accent }}
                    data-testid="comparison-bar"
                  />
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!common && (
        <p className={`mt-3 rounded-xl p-2.5 text-xs leading-snug ${light ? "bg-night/5 text-night/80" : "bg-ivory/5 text-ivory/80"}`} data-testid="distinct-note">
          Ces valeurs n&apos;ont pas le même dénominateur : elles ne se comparent pas sur une même échelle.
        </p>
      )}
    </div>
  );
}

function NatureBadge({ nature, light }: { nature: ExplanationStep["nature"]; light: boolean }) {
  const cls = nature === "fait" ? (light ? "bg-mint/20 text-[#0f6e5b]" : "bg-mint/20 text-mint-soft") : light ? "bg-amber/20 text-[#7a5410]" : "bg-amber/20 text-[#ffd98f]";
  return <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${cls}`}>{nature === "fait" ? "Fait" : "Hypothèse"}</span>;
}

function StepText({ s, light }: { s: ExplanationStep; light: boolean }) {
  return (
    <span className="text-sm leading-snug">
      <strong className="font-semibold">{s.label}</strong> <NatureBadge nature={s.nature} light={light} />
      <span className={`mt-0.5 block ${light ? "text-night/85" : "text-ivory/85"}`}>{s.text}</span>
    </span>
  );
}

function ExplanationBody({ card, accent, light }: { card: ExplanationCard; accent: string; light: boolean }) {
  if (card.layout === "alternatives") {
    // Point de départ, puis issues possibles : ni numéro ni flèche, pour ne pas suggérer un enchaînement.
    const [start, ...options] = card.steps;
    return (
      <div data-testid="explanation" data-layout="alternatives">
        <p className="rounded-xl p-2.5" style={{ boxShadow: `inset 3px 0 0 ${accent}` }}>
          <StepText s={start} light={light} />
        </p>
        <p className={`mt-3 text-xs font-bold uppercase tracking-[0.18em] ${light ? "text-night/70" : "text-ivory/70"}`}>Ensuite, selon les cas :</p>
        <ul className="mt-2 space-y-2">
          {options.map((s, i) => (
            <li key={i} className={`rounded-xl border p-2.5 ${light ? "border-night/15" : "border-ivory/15"}`}>
              {i > 0 && <span className="sr-only">ou </span>}
              <StepText s={s} light={light} />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <ol className="space-y-2.5" data-testid="explanation" data-layout="sequence">
      {card.steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: accent, color: inkOn(accent) }} aria-hidden="true">
            {i + 1}
          </span>
          <StepText s={s} light={light} />
        </li>
      ))}
    </ol>
  );
}

function Footer({ card, light, href }: { card: DataCard; light: boolean; href?: string }): ReactNode {
  const muted = light ? "text-night/75" : "text-ivory/75";
  return (
    <div className={`mt-4 border-t pt-3 text-xs ${light ? "border-night/15" : "border-ivory/15"}`} data-testid="data-footer">
      {card.note && <p className={`mb-2 leading-snug ${muted}`}>À savoir : {card.note}</p>}
      <p className={muted}>
        Source :{" "}
        <a href={card.source.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
          {card.source.label}
          <span className="sr-only"> (nouvel onglet)</span>
        </a>{" "}
        · données du <time dateTime={card.asOf}>{formatDate(card.asOf)}</time>
      </p>
      {href && (
        <Link href={href} className="mt-3 inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2 text-sm font-semibold text-night hover:bg-mint-soft">
          Comprendre
          <Icon name="arrow-right" className="size-4" />
        </Link>
      )}
    </div>
  );
}
