import type { EditorialPhoto } from "@/lib/editorial-images";
import { FadeImage } from "./FadeImage";

/**
 * Photo documentaire d'illustration, pas une preuve ni une image de l'événement.
 * Affichée à sa taille utile (sans zoom ni mouvement) et en noir et blanc
 * (traitement unique, --photo-filter). Elle remplit la zone qui la contient.
 * `near` : seule une photo proche de l'écran visible est téléchargée.
 */
export function EditorialPhotoLayer({ photo, near = true, focus }: { photo: EditorialPhoto; active?: boolean; near?: boolean; /** Cadrage (object-position), pour varier le cadrage d'une même photo. */ focus?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-night-2" aria-hidden="true"
      data-testid="editorial-photo" data-image-source="wikimedia-commons">
      {near && <FadeImage src={photo.src} className="h-full w-full object-cover" style={focus ? { objectPosition: focus } : undefined} />}
    </div>
  );
}

/** Required photographer and licence links are visible and accessible. */
export function EditorialPhotoCredit({ photo }: { photo: EditorialPhoto }) {
  return (
    <span data-testid="editorial-photo-credit">
      Photo d&apos;illustration : {photo.credit} ·{" "}
      <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{photo.license}</a>
      {" · "}
      <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">source Wikimedia Commons</a>
    </span>
  );
}
