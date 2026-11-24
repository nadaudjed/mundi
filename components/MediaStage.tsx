"use client";

import { getStoryMedia } from "@/lib/media";
import type { Story } from "@/lib/types";
import { useSaveData } from "@/lib/network";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { ImageStory } from "./ImageStory";
import { MediaCredit } from "./MediaCredit";
import { TypeCover } from "./TypeCover";
import { storyKeyword } from "@/lib/covers";
import { VideoCard } from "./VideoCard";

type Props = { story: Story; active: boolean; near: boolean };

/**
 * Choisit le meilleur média disponible pour un récit :
 * vidéo sous-titrée, puis image créditée, sinon visuel génératif.
 */
export function MediaStage({ story, active, near }: Props) {
  const reducedMotion = useReducedMotion();
  const saveData = useSaveData();
  const media = getStoryMedia(story.slug);
  const visual = <TypeCover word={storyKeyword(story)} className="absolute inset-0 bg-night-2" />;

  return (
    // Zone du média : en haut de la carte sur téléphone et tablette (le texte vient
    // en dessous, sans jamais passer par-dessus), moitié droite sur écran large.
    <div
      data-testid="media-region"
      className="relative min-h-[6rem] w-full flex-1 overflow-hidden border-b border-ivory/10 [@media(max-height:680px)]:min-h-[5rem] wide:absolute wide:top-12 wide:bottom-0 wide:right-0 wide:left-[50%] wide:w-auto wide:border-b-0 wide:border-l"
    >
      {!media ? (
        visual
      ) : media.kind === "video" ? (
        <VideoCard media={media} active={active} near={near} reducedMotion={reducedMotion} saveData={saveData} fallback={visual} />
      ) : (
        <ImageStory media={media} active={active} near={near} reducedMotion={reducedMotion} fallback={visual} />
      )}
      {media && <MediaCredit media={media} className="absolute top-3 right-4 z-20 md:right-8" />}
    </div>
  );
}
