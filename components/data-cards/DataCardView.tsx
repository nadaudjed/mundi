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
import type { SceneBackdrop } from "@/lib/scenes";
import type { EditorialPhoto } from "@/lib/editorial-images";
import { EditorialPhotoCredit, EditorialPhotoLayer } from "../EditorialPhotoLayer";
import { luminance } from "@/lib/topics";
import { RevealWords } from "../scene/RevealWords";
import { SceneCredit, SceneLayer } from "../scene/SceneLayer";

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

// Accent unique (rouge brique clair sur fond nuit) : les anciennes valeurs « mint » et « blue » y sont ramenées.
const ACCENTS = { mint: "#E07A5F", blue: "#E07A5F", amber: "#E0A43A" } as const;

type Status = "verifie" | "brouillon";

type Props = {
  card: DataCard;
  position: number;
  total: number;
  /** Couleur du sujet, utilisée si `style.accent` vaut « topic ». */
  topicColor: string;
  /** Lance l'animation d'apparition (seulement si l'appareil l'autorise). */
  active: boolean;
  near?: boolean;
  /** Texte déjà révélé (scène vue au moins une fois). Par défaut : scène active. */
  revealed?: boolean;
  status: Status;
  /** Lien « Comprendre » vers la publication complète (absent en brouillon). */
  href?: string;
  /** Afficher un cadre d'attente quand aucun visuel n'est fourni (atelier uniquement). */
  showVisualPlaceholder?: boolean;
  /** Fond plein écran approuvé (résolu au build depuis `card.scene`). Impose le ton nuit. */
  backdrop?: SceneBackdrop;
  /** Illustration thématique sourcée : jamais la preuve visuelle de la donnée chiffrée. */
  photo?: EditorialPhoto;
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

/** Cadrages successifs de la photo d'une carte à l'autre, pour ne pas répéter la même vue. */
const PHOTO_FOCUS = ["50% 35%", "50% 70%", "50% 15%", "50% 90%"];

export function DataCardView({ card, position, total, topicColor, revealed = true, status, href, showVisualPlaceholder = false, backdrop, photo, near = true }: Props) {
  // Un texte sur un fond d'ambiance reste clair sur voile sombre : le ton ivoire est alors ignoré.
  const light = !photo && !backdrop && card.style?.tone === "ivory";
  const accent = accentOf(card.style, topicColor);
  const textAccent = light ? undefined : textAccentOnNight(accent);
  const display = card.style?.emphasis !== "sans";
  const titleId = `data-${card.id}-title`;

  return (
    <div
      className={`relative h-full overflow-hidden ${light ? "bg-ivory text-night" : "bg-night text-ivory"}`}
      data-card-kind={card.kind}
      data-tone={light ? "ivory" : "night"}
      data-scene={backdrop ? backdrop.id : undefined}
      aria-labelledby={titleId}
      role="group"
    >
      {/* Sans photo, un fond approuvé reste possible derrière les chiffres. */}
      {!photo && backdrop && <SceneLayer backdrop={backdrop} focus={card.scene?.focus} />}
      <div className={`relative flex h-full flex-col ${photo ? "pt-12 md:pt-0" : ""}`}>
      {/* Photo d'illustration de la publication : bandeau en haut (téléphone), moitié droite (écran large). */}
      {photo && (
        <div className="relative min-h-[16svh] shrink-[100] grow basis-[32svh] overflow-hidden border-b border-ivory/10 wide:absolute wide:inset-y-0 wide:right-0 wide:left-[50%] wide:min-h-0 wide:border-b-0 wide:border-l" data-testid="data-photo">
          <EditorialPhotoLayer photo={photo} near={near} focus={PHOTO_FOCUS[position % PHOTO_FOCUS.length]} />
        </div>
      )}
      {/* Avec photo, le texte prend sa hauteur et la photo le reste (jusqu'à 16 % de l'écran) ;
          sur petit écran, la carte défile plutôt que de cacher sa source sous la barre d'onglets. */}
      <div className={`feed-column no-scrollbar relative flex min-h-0 flex-col ${photo ? "shrink grow-0 wide:flex-1 wide:justify-center-safe" : "flex-1"} overflow-y-auto px-5 pb-6 [@media(max-height:740px)]:pb-4 ${photo ? "pt-5 wide:pt-20 [@media(max-height:740px)]:pt-3" : "pt-16 md:pt-20 [@media(max-height:740px)]:pt-14"}`} data-testid="card-scroll">
        <div className="relative flex items-center justify-between gap-3 text-meta font-semibold">
          <span style={{ color: textAccent }} className={light ? "text-night/70" : ""}>
            Données · carte {position + 1} sur {total}
          </span>
          {status === "brouillon" && (
            <span className={`rounded-xs border border-dashed border-amber px-2 py-0.5 text-[0.65rem] ${light ? "text-[#7a5410]" : "text-[#ffd98f]"}`}>
              Brouillon — non publié
            </span>
          )}
        </div>
        <div className="relative mt-2 flex gap-1" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-0.5 flex-1 ${i <= position ? "" : light ? "bg-night/15" : "bg-ivory/20"}`} style={i <= position ? { background: accent } : undefined} />
          ))}
        </div>

        <RevealWords
          as="h2"
          id={titleId}
          text={card.headline}
          active={revealed}
          className={`relative mt-5 text-balance [@media(max-height:740px)]:mt-3 ${display ? "font-display text-[1.6rem] leading-[1.15] [@media(max-height:740px)]:text-[1.35rem]" : "text-[1.45rem] leading-[1.12] tracking-[-0.02em] [@media(max-height:740px)]:text-[1.25rem]"} font-semibold`}
        />

        <VisualArea visual={card.visual} placeholder={showVisualPlaceholder} light={light} />

        <div className={`relative mt-auto pt-4 ${photo ? "wide:mt-4" : ""}`} data-fade={revealed ? "on" : "off"}>
          {card.kind === "stat" && <StatBody card={card} accent={textAccent} display={display} light={light} />}
          {card.kind === "comparaison" && <ComparisonBody card={card} accent={accent} light={light} />}
          {card.kind === "explication" && <ExplanationBody card={card} accent={accent} light={light} />}
          <Footer card={card} light={light} href={href} backdrop={photo ? undefined : backdrop} photo={photo} />
        </div>
      </div>
      </div>
    </div>
  );
}

function VisualArea({ visual, placeholder, light }: { visual?: VisualSlot; placeholder: boolean; light: boolean }) {
  if (visual) {
    return (
      <figure className="relative mt-4 min-h-0 flex-1" data-testid="data-visual">
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
      className={`relative mt-4 flex min-h-24 flex-1 items-center justify-center rounded-md border border-dashed p-4 text-center text-xs ${light ? "border-night/25 text-night/70" : "border-ivory/25 text-ivory/70"}`}
      data-testid="data-visual-placeholder"
    >
      Emplacement du visuel : fourni par la direction artistique (facultatif)
    </div>
  );
}

function Value({ m, display, big }: { m: Measure; display: boolean; big?: boolean }) {
  return (
    <span className="whitespace-nowrap">
      <span className={`${display ? "font-display" : ""} ${big ? "text-[3.4rem] leading-none [@media(max-height:740px)]:text-[2.6rem]" : "text-2xl"} font-semibold tabular-nums`}>{formatValue(m)}</span>{" "}
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

function StatBody({ card, accent, display, light }: { card: StatCard; accent?: string; display: boolean; light: boolean }) {
  return (
    <div data-testid="stat-value">
      <p className="sr-only">{describeMeasure(card.measure)}</p>
      <div aria-hidden="true">
        <span style={{ color: accent }}>
          <Value m={card.measure} display={display} big />
        </span>
        <span className="mt-2 block">
          <Context m={card.measure} light={light} />
        </span>
      </div>
      {card.context && <p className={`mt-3 text-[0.95rem] leading-relaxed [@media(max-height:740px)]:text-sm ${light ? "text-night/85" : "text-ivory/85"}`}>{card.context}</p>}
    </div>
  );
}

function ComparisonBody({ card, accent, light }: { card: ComparisonCard; accent: string; light: boolean }) {
  const common = card.presentation === "echelle-commune";
  const max = Math.max(...card.items.map((m) => m.value), 0);
  return (
    <div data-testid="comparison" data-presentation={card.presentation}>
      <ul className="space-y-3 [@media(max-height:740px)]:space-y-2">
        {card.items.map((m, i) => (
          <li key={i}>
            <p className="sr-only">{describeMeasure(m)}</p>
            <div aria-hidden="true">
              <Value m={m} display={false} />
              <Context m={m} light={light} />
              {common && max > 0 && (
                <span className={`mt-1.5 block h-2 w-full overflow-hidden ${light ? "bg-night/10" : "bg-ivory/10"}`}>
                  <span
                    className="block h-full"
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
        <p className={`mt-3 border-l-2 border-amber pl-3 text-xs leading-snug ${light ? "text-night/80" : "text-ivory/80"}`} data-testid="distinct-note">
          Ces valeurs n&apos;ont pas le même dénominateur : elles ne se comparent pas sur une même échelle.
        </p>
      )}
    </div>
  );
}

function NatureBadge({ nature, light }: { nature: ExplanationStep["nature"]; light: boolean }) {
  const cls = nature === "fait" ? (light ? "text-night/70" : "text-ivory/70") : light ? "text-[#7a5410]" : "text-[#ffd98f]";
  return <span className={`ml-1 text-[0.7rem] font-semibold ${cls}`}>({nature === "fait" ? "Fait" : "Hypothèse"})</span>;
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
        <p className="border-l-2 pl-3" style={{ borderColor: accent }}>
          <StepText s={start} light={light} />
        </p>
        <p className={`mt-3 text-meta font-semibold ${light ? "text-night/70" : "text-ivory/70"}`}>Ensuite, selon les cas :</p>
        <ul className="mt-2 space-y-2">
          {options.map((s, i) => (
            <li key={i} className={`border-t pt-2 ${light ? "border-night/15" : "border-ivory/20"}`}>
              {i > 0 && <span className="sr-only">ou </span>}
              <StepText s={s} light={light} />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <ol className="space-y-2.5 [@media(max-height:740px)]:space-y-1.5" data-testid="explanation" data-layout="sequence">
      {card.steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 shrink-0 font-mono text-xs" style={{ color: light ? undefined : textAccentOnNight(accent) }} aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          <StepText s={s} light={light} />
        </li>
      ))}
    </ol>
  );
}

function Footer({ card, light, href, backdrop, photo }: { card: DataCard; light: boolean; href?: string; backdrop?: SceneBackdrop;photo?:EditorialPhoto }): ReactNode {
  const muted = light ? "text-night/75" : "text-ivory/75";
  return (
    <div className={`mt-4 border-t pt-3 text-xs [@media(max-height:740px)]:mt-3 [@media(max-height:740px)]:pt-2 ${light ? "border-night/15" : "border-ivory/15"}`} data-testid="data-footer">
      {card.note && <p className={`mb-2 leading-snug ${muted}`}>À savoir : {card.note}</p>}
      <p className={muted}>
        Source :{" "}
        <a href={card.source.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
          {card.source.label}
          <span className="sr-only"> (nouvel onglet)</span>
        </a>{" "}
        · données du <time dateTime={card.asOf}>{formatDate(card.asOf)}</time>
      </p>
      {photo ? (
        <p className={`mt-1 text-[0.65rem] ${muted}`}>
          <EditorialPhotoCredit photo={photo} />
        </p>
      ) : backdrop && (
        <p className={`mt-1 text-[0.65rem] ${muted}`}>
          <SceneCredit backdrop={backdrop} />
        </p>
      )}
      {href && (
        <Link href={href} className="btn btn-light mt-3">
          Comprendre
        </Link>
      )}
    </div>
  );
}
