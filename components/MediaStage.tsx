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

  return (
    <>
      {media ? (
        // Sur écran large, la vidéo ou l'image occupe la moitié droite : le texte reste à gauche, sans chevauchement.
        <div className="absolute inset-0 wide:left-[46%]">
          {media.kind === "video" ? (
            <VideoCard media={media} active={active} near={near} reducedMotion={reducedMotion} saveData={saveData} fallback={visual} />
          ) : (
            <ImageStory media={media} active={active} near={near} reducedMotion={reducedMotion} fallback={visual} />
          )}
        </div>
      ) : (
        visual
      )}
      {media && <MediaCredit media={media} className="absolute top-[max(4.5rem,calc(env(safe-area-inset-top)+3.75rem))] right-4 z-20 md:right-8" />}
    </>
  );
}
