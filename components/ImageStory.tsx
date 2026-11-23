"use client";

import type { ImageMedia } from "@/lib/media";

type Props = { media: ImageMedia; active: boolean; near: boolean; reducedMotion: boolean };

/**
 * Image (photo ou illustration) en fond de carte : l'image entière est
 * visible en haut, un fond flou de la même image remplit le reste.
 * Chargement différé : rien n'est téléchargé tant que la carte est loin.
 */
export function ImageStory({ media, active, near, reducedMotion }: Props) {
  if (!near) return <div className="absolute inset-0 bg-night" aria-hidden="true" />;
  const zoom = active && !reducedMotion;
  return (
    <div className="absolute inset-0 overflow-hidden bg-night" data-media="image">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media.src} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
      <div className="absolute inset-x-6 top-[9.5rem] bottom-[46%] flex items-center justify-center md:top-14">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.src}
          alt={media.alt}
          width={media.width}
          height={media.height}
          loading="lazy"
          decoding="async"
          className={`h-auto max-h-full w-auto max-w-full rounded-3xl shadow-2xl ring-1 ring-ivory/10 transition-transform duration-[9000ms] ease-out ${zoom ? "scale-[1.04]" : "scale-100"}`}
        />
      </div>
    </div>
  );
}
