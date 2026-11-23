"use client";

import { getStoryMedia } from "@/lib/media";
import { getTopic } from "@/lib/topics";
import type { Story } from "@/lib/types";
import { useSaveData } from "@/lib/network";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { ImageStory } from "./ImageStory";
import { MediaCredit } from "./MediaCredit";
import { StoryVisual } from "./StoryVisual";
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
  const topic = getTopic(story.topic)!;
  const visual = <StoryVisual pattern={topic.pattern} color={topic.color} seed={story.slug} className="absolute inset-0 h-full w-full" />;

  if (!media) return visual;

  return (
    // Zone du média : en haut de la carte sur téléphone et tablette (le texte vient
    // en dessous, sans jamais passer par-dessus), moitié droite sur écran large.
    <div
      data-testid="media-region"
      className="relative mt-[calc(max(env(safe-area-inset-top),0.75rem)+2.75rem)] min-h-[8rem] w-full flex-1 [@media(max-height:680px)]:min-h-[5.5rem] overflow-hidden wide:absolute wide:top-16 wide:bottom-0 wide:right-0 wide:left-[46%] wide:mt-0 wide:w-auto"
    >
      {media.kind === "video" ? (
        <VideoCard media={media} active={active} near={near} reducedMotion={reducedMotion} saveData={saveData} fallback={visual} />
      ) : (
        <ImageStory media={media} active={active} near={near} reducedMotion={reducedMotion} fallback={visual} />
      )}
      {/* Fondu vers le texte, en bas de la zone. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-night to-transparent wide:hidden" aria-hidden="true" />
      <MediaCredit media={media} className="absolute top-3 right-4 z-20 md:right-8" />
    </div>
  );
}
