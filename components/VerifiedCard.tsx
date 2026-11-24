"use client";

import { memo } from "react";
import Link from "next/link";
import { formatValue } from "@/lib/data-cards";
import { keyFigureOf } from "@/lib/covers";
import { formatDate } from "@/lib/format";
import { publicationKey, publicationPath } from "@/lib/publication-links";
import { getTopic } from "@/lib/topics";
import { verificationLabel } from "@/lib/verification";
import type { FeedPublication } from "@/lib/verified";
import { KIND_LABEL, publicationKind } from "@/lib/publication-kind";
import { FitLines } from "./FitLines";
import { NewsDate } from "./NewsDate";
import { ListenButton } from "./ListenButton";
import { SaveButton, ShareButton } from "./StoryActions";
import { TypeCover } from "./TypeCover";
import { SceneLayer } from "./scene/SceneLayer";
import { EditorialPhotoLayer, EditorialPhotoCredit } from "./EditorialPhotoLayer";

export type { CardVisual } from "./EditorialBackdrop";
import type { CardVisual } from "./EditorialBackdrop";

type Props = {
  publication: FeedPublication;
  index: number;
  position: number;
  total: number;
  active: boolean;
  near?: boolean;
  /** Conservé pour compatibilité : le texte s'affiche toujours tout de suite. */
  revealed?: boolean;
  visual?: CardVisual;
};

/**
 * Écran d'une publication sourcée dans le Fil.
 * Téléphone : visuel en haut (photo noir et blanc, chiffre clé ou mot typographié),
 * texte en dessous sur fond uni ; tablette en paysage et ordinateur : texte à gauche,
 * visuel à droite. Les boutons « Lire la publication » et « Écouter » sont hors de la
 * zone qui défile : toujours visibles, quelle que soit la hauteur d'écran.
 */
export const VerifiedCard = memo(function VerifiedCard({ publication: p, index, position, total, active, near = active }: Props) {
  const topic = getTopic(p.topic)!;
  const backdrop = p.scene ? p.backdrops?.[p.scene.backdrop] : undefined;
  const photo = p.photo;
  const figure = keyFigureOf(p);
  const href = publicationPath(p.slug);

  return (
    <article
      data-index={index}
      data-publication={p.slug}
      data-topic={p.topic}
      data-testid="verified-card"
      aria-roledescription="publication sourcée"
      aria-label={`Publication ${position + 1} sur ${total} : ${p.title}`}
      className="relative flex h-full snap-start snap-always flex-col overflow-hidden bg-night pt-12 text-ivory"
    >
      {/* Visuel : en haut sur téléphone, moitié droite sur écran large. */}
      <div className="relative h-[26svh] min-h-[5rem] shrink-0 [@media(max-height:640px)]:h-[19svh] overflow-hidden border-b border-ivory/10 wide:absolute wide:inset-y-0 wide:right-0 wide:left-[50%] wide:border-b-0 wide:border-l" data-testid="card-visual">
        {photo ? (
          <EditorialPhotoLayer photo={photo} near={near} />
        ) : figure ? (
          <div aria-hidden="true" className="absolute inset-0 flex items-end bg-night-2 p-5 md:p-8">
            <span className="font-display text-[clamp(3.5rem,12vw,8rem)] leading-[0.9] font-semibold tracking-[-0.03em] text-brick-light">
              {formatValue(figure.measure)}
              <span className="ml-2 align-baseline text-[0.28em] tracking-normal text-ivory/85">{figure.measure.unit}</span>
            </span>
          </div>
        ) : backdrop ? (
          <SceneLayer backdrop={backdrop} focus={p.scene?.focus} />
        ) : (
          <TypeCover word={topic.name} className="absolute inset-0 bg-night-2" />
        )}
      </div>

      {/* Téléphone : le texte occupe la place restante, sans zone qui défile ; le résumé
          s'arrête sur une ligne entière. Écran large : colonne de texte complète. */}
      <div className="no-scrollbar relative flex min-h-0 flex-1 flex-col overflow-hidden wide:overflow-y-auto" data-testid="card-scroll">
        <div className="feed-column relative flex min-h-0 flex-1 flex-col px-5 pt-4 pb-2 wide:my-auto wide:flex-none wide:py-8">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-meta font-semibold text-brick-light">
                {topic.name}
                <span className="font-normal text-ivory/70"> · {KIND_LABEL[publicationKind(p)]}</span>
                {p.fixture && <span className="ml-2 text-[#ffd98f]">Exemple de test</span>}
              </p>
              {/* La date de l'actualité, en clair : on sait de quel jour elle date. */}
              <NewsDate publication={p} compact className="mt-0.5 text-[0.8rem] font-semibold text-ivory" />
            </div>
            <div className="-mr-2 flex shrink-0 items-center">
              <SaveButton slug={publicationKey(p.slug)} title={p.title} variant="rail" />
              <ShareButton slug={p.slug} path={href} title={p.title} variant="rail" />
            </div>
          </div>

          <h2 className="mt-1 shrink-0 font-display text-[1.55rem] leading-[1.1] font-semibold text-balance md:text-[2.1rem] lg:text-[2.6rem] [@media(max-height:740px)]:text-[1.35rem]">{p.title}</h2>
          <FitLines testId="verified-summary" className="mt-2 flex-1 text-[0.95rem] leading-relaxed text-ivory/85 wide:flex-none">{p.summary}</FitLines>

          {/* Une seule ligne grise : visuel, contrôle, dates, sources. */}
          <p className="mt-3 shrink-0 text-meta text-ivory/70" data-testid="verified-meta">
            <span data-testid="verified-credit">
              {photo ? <EditorialPhotoCredit photo={photo} /> : backdrop ? `Fond : ${backdrop.credit} · ${backdrop.license}` : figure ? `Chiffre clé : ${figure.source.label}` : "Visuel typographique MUNDI"}
            </span>{" "}
            · <span data-testid="verification-label">{verificationLabel(p)}</span> · publié le{" "}
            <time dateTime={p.publishedAt} className="font-mono">{formatDate(p.publishedAt)}</time>
            {p.updatedAt !== p.publishedAt && (
              <>
                {" "}
                · actualisé le <time dateTime={p.updatedAt} className="font-mono">{formatDate(p.updatedAt)}</time>
              </>
            )}
            {/* Téléphone : les sources complètes sont sur la page de la publication. */}
            <span className="wide:hidden">
              {" "}
              ·{" "}
              <Link href={`${href}#sources`} className="underline underline-offset-2" data-testid="verified-sources-link">
                <span className="font-mono">{p.sources.length}</span> source{p.sources.length > 1 ? "s" : ""}
              </Link>
            </span>
          </p>
          <ol className="mt-2 hidden space-y-0.5 text-meta text-ivory/80 wide:block" data-testid="verified-sources" aria-label="Sources">
            {p.sources.map((s, i) => (
              <li key={s.url} className="flex gap-2">
                <span className="font-mono text-ivory/60">{String(i + 1).padStart(2, "0")}</span>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 underline underline-offset-2 hover:text-ivory">
                  {s.label}
                  <span className="sr-only"> (nouvel onglet)</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Barre d'actions hors de la zone qui défile : visible sans défiler, quelle que soit la hauteur d'écran. */}
      <div className="feed-column relative flex shrink-0 flex-nowrap items-center gap-x-3 px-5 pt-2 pb-4 max-[359px]:gap-x-2 max-[359px]:[&_.btn]:px-3.5" data-testid="card-actions">
        <Link href={href} aria-label={`Lire la publication : ${p.title}`} className="btn btn-light">
          Lire la publication
        </Link>
        <ListenButton title={p.title} summary={p.summary} points={p.keyPoints} active={active} />
      </div>
    </article>
  );
});
