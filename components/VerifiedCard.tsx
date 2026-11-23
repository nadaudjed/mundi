"use client";

import Link from "next/link";
import { formatDate } from "@/lib/format";
import { publicationKey, publicationPath } from "@/lib/publication-links";
import { getTopic, inkOn } from "@/lib/topics";
import type { FeedPublication } from "@/lib/verified";
import { Icon } from "./Icon";
import { ListenButton } from "./ListenButton";
import { SaveButton, ShareButton } from "./StoryActions";
import { EditorialBackdrop } from "./EditorialBackdrop";
import { RevealWords } from "./scene/RevealWords";
import { MotionToggle } from "./scene/MotionToggle";
import { SceneLayer } from "./scene/SceneLayer";

export type { CardVisual } from "./EditorialBackdrop";
import type { CardVisual } from "./EditorialBackdrop";

export function VerifiedBadge({ tone = "light" }: { tone?: "light" | "dark" }) {
  const styles = tone === "light" ? "border-mint/60 bg-mint/15 text-mint-soft" : "border-mint/60 bg-mint/10 text-[#0f6e5b]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider ${styles}`}>
      <Icon name="check" className="size-3.5" />
      Vérifié
    </span>
  );
}

type Props = {
  publication: FeedPublication;
  index: number;
  position: number;
  total: number;
  active: boolean;
  /** Texte déjà révélé (scène vue au moins une fois). Par défaut : scène active. */
  revealed?: boolean;
  visual: CardVisual;
};

export function VerifiedCard({ publication: p, index, position, total, active, revealed = active, visual }: Props) {
  const topic = getTopic(p.topic)!;
  const shown = p.sources.slice(0, 3);
  const more = p.sources.length - shown.length;
  const backdrop = p.scene ? p.backdrops?.[p.scene.backdrop] : undefined;

  return (
    <article
      data-index={index}
      data-publication={p.slug}
      data-testid="verified-card"
      aria-roledescription="publication vérifiée"
      aria-label={`Publication vérifiée ${position + 1} sur ${total} : ${p.title}`}
      className="relative flex h-full snap-start snap-always flex-col overflow-hidden bg-night text-ivory"
    >
      {backdrop ? (
        <SceneLayer backdrop={backdrop} focus={p.scene?.focus} active={active} />
      ) : (
        <>
          <EditorialBackdrop visual={visual} color={topic.color} pattern={topic.pattern} seed={p.slug} />
          <div className="grain pointer-events-none absolute inset-0" aria-hidden="true" />
        </>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night from-35% via-night/80 via-55% to-night/30" aria-hidden="true" />

      {/* Sur petit écran, le contenu défile dans la carte plutôt que d'être coupé sous la barre d'onglets. */}
      <div className="no-scrollbar relative flex min-h-0 flex-1 flex-col overflow-y-auto" data-testid="card-scroll">
        <div className="pointer-events-none relative mt-auto flex items-end gap-2 px-5 pb-6 pt-32 md:px-6 md:pb-8 [@media(max-height:740px)]:pt-24 [@media(max-height:740px)]:pb-4">
          <div className="pointer-events-auto min-w-0 flex-1">
            {/* Crédit du visuel dans le flux : il ne recouvre jamais les badges, même à 320 px. */}
            <p className="mb-2 inline-block max-w-full rounded-full bg-night/70 px-2.5 py-1 text-[0.68rem] font-semibold text-ivory/90 ring-1 ring-ivory/20" data-testid="verified-credit">
              {backdrop ? `Fond : ${backdrop.credit} · ${backdrop.license}` : "Visuel : motif génératif MUNDI"}
            </p>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.75rem] font-semibold">
              <VerifiedBadge />
              <span className="rounded-full px-2.5 py-1" style={{ background: topic.color, color: inkOn(topic.color) }}>
                {topic.name}
              </span>
              {p.fixture && <span className="rounded-full border border-amber/60 px-2.5 py-1 text-[#ffd98f]">Exemple de test</span>}
            </div>

            <RevealWords as="h2" text={p.title} active={revealed} className="font-display text-[1.6rem] leading-[1.12] font-semibold text-balance md:text-[1.75rem] [@media(max-height:740px)]:text-[1.35rem]" />
            <p data-fade={revealed ? "on" : "off"} className="mt-3 text-[0.92rem] leading-relaxed text-ivory/80 [@media(max-height:760px)]:line-clamp-2">{p.summary}</p>

            <p className="mt-3 text-xs text-ivory/75" data-testid="verified-meta">
              Publié le <time dateTime={p.publishedAt}>{formatDate(p.publishedAt)}</time>
              {p.updatedAt !== p.publishedAt && (
                <>
                  {" "}
                  · actualisé le <time dateTime={p.updatedAt}>{formatDate(p.updatedAt)}</time>
                </>
              )}{" "}
              · relu par {p.reviewedBy}
              {backdrop && (
                <>
                  {" "}
                  · <MotionToggle />
                </>
              )}
            </p>

            <div className="mt-3" data-testid="verified-sources">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-mint-soft">Sources</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {shown.map((s) => (
                  <li key={s.url} className="max-w-full">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-[min(16rem,100%)] items-center gap-1 truncate rounded-full border border-ivory/25 bg-night/60 px-2.5 py-1 text-xs text-ivory underline-offset-2 hover:border-ivory/60 hover:underline"
                    >
                      <span className="truncate">{s.label}</span>
                      <span className="sr-only"> (nouvel onglet)</span>
                    </a>
                  </li>
                ))}
                {more > 0 && (
                  <li>
                    <Link href={publicationPath(p.slug)} className="inline-flex rounded-full px-2 py-1 text-xs text-ivory/80 underline underline-offset-2">
                      + {more} autre{more > 1 ? "s" : ""}
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 [@media(max-height:740px)]:mt-3">
              <Link
                href={publicationPath(p.slug)}
                className="inline-flex items-center gap-2 rounded-full bg-mint px-5 py-2.5 text-sm font-semibold text-night transition hover:bg-mint-soft"
              >
                Lire la publication
                <Icon name="arrow-right" className="size-4" />
              </Link>
              <ListenButton title={p.title} summary={p.summary} points={p.keyPoints} active={active} />
            </div>
          </div>

          <div className="pointer-events-auto flex shrink-0 flex-col items-center gap-1 self-end pb-12">
            <SaveButton slug={publicationKey(p.slug)} title={p.title} variant="rail" />
            <ShareButton slug={p.slug} path={publicationPath(p.slug)} title={p.title} variant="rail" />
          </div>
        </div>
      </div>
    </article>
  );
}
