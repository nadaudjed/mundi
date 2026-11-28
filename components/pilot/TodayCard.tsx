"use client";

import Link from "next/link";
import { memo } from "react";
import { useEditionDayPassed } from "@/lib/use-edition-day";
import { publicationKey, publicationPath } from "@/lib/publication-links";
import { KIND_LABEL, publicationKind } from "@/lib/publication-kind";
import { twoSentences } from "@/lib/today";
import { frenchSpacing } from "@/lib/typo";
import { getTopic } from "@/lib/topics";
import { verificationLabel } from "@/lib/verification";
import type { TodayState } from "@/lib/today";
import type { FeedPublication } from "@/lib/verified";
import { EditorialPhotoLayer } from "../EditorialPhotoLayer";
import { ListenButton } from "../ListenButton";
import { SaveButton } from "../StoryActions";
import { MundiCover } from "../MundiCover";
import { DecryptageVisual } from "./DecryptageVisual";

type Props = {
  publication: FeedPublication;
  index: number;
  /** Rang dans l'édition (0, 1, 2) et taille de l'édition. */
  rank: number;
  size: number;
  edition: string;
  /** État de l'édition (#125) : en repli, l'en-tête ne dit plus « Aujourd'hui ». */
  state?: TodayState;
  /** Date de Paris du build : passé minuit, une édition « du jour » devient « Dernière édition ». */
  builtFor?: string;
  active: boolean;
  near: boolean;
  /** Sujet ajouté parce qu'un sujet choisi manquait (sélection de secours). */
  fallback: boolean;
  onSkip: () => void;
};

/** En-tête de l'édition selon son état (lib/today.ts). */
function editionLabel(state?: TodayState): string {
  if (state === "perimee" || state === "automatique") return "Les plus récentes";
  if (state === "sans-nouveaute") return "Dernière édition";
  return "Aujourd'hui";
}

const editionDate = (d: string) => {
  const t = Date.parse(d);
  return Number.isNaN(t) ? "" : new Date(t).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
};

/**
 * Carte de l'édition « Aujourd'hui » (pilote, ticket 109), pensée pour le téléphone :
 * rubrique et format, un visuel lié au sujet, un titre court, deux phrases (le fait et
 * sa conséquence), puis « Comprendre » en action principale. Écouter et Enregistrer restent
 * à portée de pouce. Composition « magazine » : ivoire, graphite, rouge MUNDI.
 */
export const TodayCard = memo(function TodayCard({ publication: p, index, rank, size, edition, state: built, builtFor, active, near, fallback, onSkip }: Props) {
  const state: TodayState | undefined = useEditionDayPassed(builtFor) && (built === "a-jour" || built === undefined) ? "sans-nouveaute" : built;
  const d = p.decryptage;
  const topic = getTopic(p.topic)!;
  const href = publicationPath(p.slug);
  const title = frenchSpacing(d?.shortTitle ?? p.title);
  const text = frenchSpacing(d ? `${d.essentiel.fait} ${d.essentiel.consequence}` : twoSentences(p.summary));
  const format = d?.format ?? KIND_LABEL[publicationKind(p)];
  const visualType = d?.visual?.type;

  return (
    <article
      data-index={index}
      data-publication={p.slug}
      data-testid="today-card"
      data-today-rank={rank + 1}
      data-fallback={fallback ? "true" : undefined}
      aria-roledescription="sujet du jour"
      aria-label={`Aujourd'hui, sujet ${rank + 1} sur ${size} : ${title}`}
      className="magazine relative flex h-full snap-start snap-always flex-col overflow-hidden bg-ivory pt-12 text-graphite"
    >
      {/* En-tête de l'édition : on sait où l'on est et comment passer au fil complet. */}
      <div className="feed-column flex shrink-0 items-center justify-between gap-3 px-5 pt-2 pb-2">
        <p className="min-w-0 truncate text-[0.72rem] font-semibold tracking-[0.12em] text-brick uppercase">
          {editionLabel(state)} · {rank + 1}/{size}
          <span className="ml-2 font-normal tracking-normal text-graphite-2 normal-case max-[359px]:hidden">{editionDate(edition)}</span>
        </p>
        <button type="button" onClick={onSkip} className="shrink-0 text-[0.75rem] font-semibold text-graphite-2 underline underline-offset-2 hover:text-graphite" data-testid="today-skip">
          Tout le fil
        </button>
      </div>

      <div className="relative mx-5 h-[24svh] min-h-[5rem] shrink-0 overflow-hidden bg-ivory-2 [@media(min-height:760px)]:h-[33svh] [@media(max-height:640px)]:h-[13svh] sm:mx-auto sm:h-[32svh] sm:w-full sm:max-w-[36rem] wide:absolute! wide:inset-y-0 wide:right-0 wide:left-[50%] wide:mx-0! wide:h-auto! wide:max-w-none! wide:w-auto! wide:border-l wide:border-graphite/10" data-testid="card-visual" data-visual-kind={visualType ?? (p.photo ? "photo" : "typographie")}>
        {d?.visual ? (
          <DecryptageVisual decryptage={d} photo={p.photo} word={topic.name} variant="card" publication={p} />
        ) : p.photo ? (
          <EditorialPhotoLayer photo={p.photo} near={near} fallback={<MundiCover publication={p} tone="paper" className="absolute inset-0 wide:pt-12" />} />
        ) : (
          <MundiCover publication={p} tone="paper" className="absolute inset-0 wide:pt-12" />
        )}
      </div>

      <div className="feed-column relative flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-3 wide:flex-none wide:my-auto wide:py-6">
        <p className="text-[0.72rem] font-semibold text-brick">
          {topic.name}
          <span className="font-normal text-graphite-2"> · {format}</span>
          {fallback && state !== "perimee" && <span className="font-normal text-graphite-2"> · sélection de secours</span>}
        </p>
        <h2 className="font-serif mt-1 shrink-0 text-[1.85rem] leading-[1.05] text-balance max-[359px]:text-[1.6rem] md:text-[2.4rem] [@media(max-height:700px)]:text-[1.55rem]">{title}</h2>
        <p className="mt-2 min-h-0 overflow-hidden text-[0.95rem] leading-relaxed text-graphite-2 [@media(max-height:640px)]:text-[0.86rem] [@media(max-height:640px)]:leading-snug [@media(max-height:640px)]:line-clamp-7" data-testid="today-text">{text}</p>
        <p className="mt-auto shrink-0 pt-2 pb-1 wide:mt-4 text-[0.7rem] text-graphite-2" data-testid="today-meta">
          <span data-testid="verification-label">{verificationLabel(p)}</span> ·{" "}
          <Link href={`${href}#sources`} className="underline underline-offset-2">{p.sources.length} sources</Link>
        </p>
      </div>

      <div className="feed-column relative flex shrink-0 flex-nowrap items-center gap-x-2.5 px-5 pt-1 pb-4 max-[359px]:gap-x-1.5 max-[359px]:[&_.btn]:px-3" data-testid="card-actions">
        <Link href={d ? `${href}#comprendre` : href} aria-label={`Comprendre : ${title}`} className="btn btn-graphite" data-testid="today-understand">
          Comprendre
        </Link>
        <ListenButton title={p.title} summary={p.summary} points={p.keyPoints} active={active} audioSrc={p.audio} href={href} tone="paper" />
        <span className="ml-auto">
          <SaveButton slug={publicationKey(p.slug)} title={p.title} variant="paper" />
        </span>
      </div>
    </article>
  );
});
