import { StoryVisual } from "./StoryVisual";

/** Variantes visuelles sans photo : aucune image dont les droits seraient incertains. */
export type CardVisual = "motif" | "sobre";

/**
 * Fond éditorial original, sans média externe.
 * - « motif » : motif génératif du sujet, qui dérive lentement (seulement si
 *   l'appareil n'a pas demandé de réduire les animations) ;
 * - « sobre » : simple halo de couleur, totalement statique.
 * Purement décoratif : tout le sens est porté par le texte de la carte.
 */
export function EditorialBackdrop({ visual, color, pattern, seed }: { visual: CardVisual; color: string; pattern: Parameters<typeof StoryVisual>[0]["pattern"]; seed: string }) {
  if (visual === "sobre") {
    return (
      <div className="absolute inset-0" aria-hidden="true" data-visual="sobre">
        <div className="absolute inset-0" style={{ background: `radial-gradient(120% 70% at 20% 10%, ${color}55, transparent 60%)` }} />
      </div>
    );
  }
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true" data-visual="motif">
      <StoryVisual pattern={pattern} color={color} seed={seed} className="h-full w-full scale-110 opacity-70 motion-safe:animate-drift" />
    </div>
  );
}

