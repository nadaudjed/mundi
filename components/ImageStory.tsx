"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ImageMedia } from "@/lib/media";
import { Icon } from "./Icon";

type Props = { media: ImageMedia; active: boolean; near: boolean; reducedMotion: boolean; fallback: ReactNode };

/**
 * Image (photo ou illustration) de la carte : l'image entière est visible,
 * sur fond uni, sans flou ni zoom.
 * Chargement différé : rien n'est téléchargé tant que la carte est loin.
 * En cas d'erreur : visuel génératif + message discret ; le fil continue.
 */
export function ImageStory({ media, near, fallback }: Props) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // Une erreur survenue avant l'hydratation n'est pas signalée par React : on vérifie au montage.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, [near]);
  if (!near) return <div className="absolute inset-0 bg-night" aria-hidden="true" />;
  if (failed) {
    return (
      <div className="absolute inset-0" data-media="image" data-state="error">
        {fallback}
        <p role="status" className="absolute inset-x-4 top-14 z-10 flex items-center gap-2 rounded-md bg-night p-3 text-sm text-ivory ring-1 ring-amber/40">
          <Icon name="alert" className="size-5 shrink-0 text-amber" />
          Illustration indisponible pour le moment.
        </p>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 overflow-hidden bg-night" data-media="image">
      <div className="absolute inset-x-6 top-10 bottom-4 flex items-center justify-center wide:top-16 wide:bottom-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.src}
          alt={media.alt}
          width={media.width}
          height={media.height}
          loading="lazy"
          decoding="async"
          ref={img}
          onError={() => setFailed(true)}
          className="h-auto max-h-full w-auto max-w-full"
        />
      </div>
    </div>
  );
}
