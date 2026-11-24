import type { EditorialPhoto } from "@/lib/editorial-images";
/** Photo documentaire d'illustration, pas une preuve ni une image de l'événement. */
export function EditorialPhotoLayer({ photo, active, near = active }: { photo: EditorialPhoto; active: boolean; near?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true"
      data-testid="editorial-photo" data-image-source="wikimedia-commons">
      <div
        className={"scene-image absolute inset-[-5%] bg-cover bg-center " + (active ? "motion-safe:animate-scene-drift motion-pausable" : "")}
        style={{ backgroundImage: near ? 'url("' + photo.src + '")' : undefined }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,21,0.70)_0%,rgba(3,10,21,0.12)_32%,rgba(3,10,21,0.22)_48%,rgba(3,10,21,0.92)_88%)]" />
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
