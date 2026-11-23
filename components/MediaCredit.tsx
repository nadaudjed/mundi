"use client";

import { useId, useState } from "react";
import type { Media } from "@/lib/media";

/** Bouton « Crédits » : auteur, licence et provenance du média, toujours accessibles. */
export function MediaCredit({ media, className = "relative" }: { media: Media; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const kind = media.kind === "video" ? "Vidéo" : media.nature === "photo" ? "Photo" : "Illustration";

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="rounded-full bg-night/70 px-2.5 py-1 text-[0.68rem] font-semibold text-ivory/90 ring-1 ring-ivory/20 backdrop-blur hover:bg-night/90"
      >
        © {kind} · {media.credit.author}
      </button>
      {open && (
        <div
          id={id}
          role="region"
          aria-label="Crédits du média"
          className="absolute top-full right-0 z-30 mt-2 w-64 rounded-2xl bg-night/95 p-4 text-left text-xs leading-relaxed text-ivory shadow-2xl ring-1 ring-ivory/15 backdrop-blur"
        >
          <dl className="space-y-2">
            <div>
              <dt className="font-semibold text-mint-soft">Auteur</dt>
              <dd>{media.credit.author}</dd>
            </div>
            <div>
              <dt className="font-semibold text-mint-soft">Licence</dt>
              <dd>
                {media.credit.licenseUrl ? (
                  <a href={media.credit.licenseUrl} className="underline" target="_blank" rel="noreferrer">
                    {media.credit.license}
                  </a>
                ) : (
                  media.credit.license
                )}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-mint-soft">Provenance</dt>
              <dd className="text-ivory/80">{media.credit.provenance}</dd>
            </div>
            {media.kind === "video" && (
              <div>
                <dt className="font-semibold text-mint-soft">Ce que montre la vidéo</dt>
                <dd className="text-ivory/80">{media.description}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
