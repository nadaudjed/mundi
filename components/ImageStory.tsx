"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ImageMedia } from "@/lib/media";
import { Icon } from "./Icon";

type Props = { media: ImageMedia; active: boolean; near: boolean; reducedMotion: boolean; fallback: ReactNode };

/**
 * Image (photo ou illustration) en fond de carte : l'image entière est
 * visible en haut, un fond flou de la même image remplit le reste.
 * Chargement différé : rien n'est téléchargé tant que la carte est loin.
 * En cas d'erreur : visuel génératif + message discret ; le fil continue.
 */
export function ImageStory({ media, active, near, reducedMotion, fallback }: Props) {
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
        <p role="status" className="absolute inset-x-4 top-14 z-10 flex items-center gap-2 rounded-2xl bg-night/85 p-3 text-sm text-ivory ring-1 ring-amber/40">
          <Icon name="alert" className="size-5 shrink-0 text-amber" />
          Illustration indisponible pour le moment.
        </p>
      </div>
    );
  }
  const zoom = active && !reducedMotion;
  return (
    <div className="absolute inset-0 overflow-hidden bg-night" data-media="image">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media.src} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
      <div className="absolute inset-x-6 top-14 bottom-6 flex items-center justify-center wide:top-24 wide:bottom-16">
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
          className={`h-auto max-h-full w-auto max-w-full rounded-3xl shadow-2xl ring-1 ring-ivory/10 transition-transform duration-[9000ms] ease-out ${zoom ? "scale-[1.04]" : "scale-100"}`}
        />
      </div>
    </div>
  );
}
