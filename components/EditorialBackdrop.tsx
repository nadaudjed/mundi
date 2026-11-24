import { TypeCover } from "./TypeCover";

/** Ancien choix de visuel sans photo, conservé pour compatibilité (atelier). */
export type CardVisual = "motif" | "sobre";

/**
 * Couverture sans photo : un mot-clé typographié sur fond uni (plus de motif
 * génératif). Purement décorative : tout le sens est porté par le texte.
 */
export function EditorialBackdrop({ word }: { word: string; visual?: CardVisual; color?: string; pattern?: unknown; seed?: string }) {
  return <TypeCover word={word} className="absolute inset-0" />;
}
