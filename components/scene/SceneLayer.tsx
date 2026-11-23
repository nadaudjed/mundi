import { focusPosition, type SceneBackdrop, type SceneRef } from "@/lib/scenes";

/**
 * Couche d'ambiance plein écran (ticket #30), derrière le texte d'une carte.
 * - Fond approuvé uniquement (registre content/scenes.json, contrôlé au build).
 * - Purement décoratif : masqué aux lecteurs d'écran, ne porte aucune donnée.
 * - Léger mouvement seulement sur la scène active, si l'appareil l'autorise,
 *   et suspendu par le bouton « Pause » (MotionToggle).
 * - Voile sombre en haut et en bas pour garder le texte lisible.
 */
export function SceneLayer({ backdrop, focus, active }: { backdrop: SceneBackdrop; focus?: SceneRef["focus"]; active: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-testid="scene-backdrop" data-backdrop={backdrop.id}>
      <div
        className={`scene-image absolute inset-[-6%] bg-cover ${active ? "motion-safe:animate-scene-drift motion-pausable" : ""}`}
        style={{ backgroundImage: `url("${backdrop.src}")`, backgroundPosition: focusPosition(focus) }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,21,0.78)_0%,rgba(3,10,21,0.18)_30%,rgba(3,10,21,0.22)_48%,rgba(3,10,21,0.92)_82%)]" />
      <div className={`absolute top-[24%] left-0 h-px w-[44%] max-w-[20rem] origin-left bg-gradient-to-r from-mint to-transparent ${active ? "motion-safe:animate-thread" : ""}`} />
    </div>
  );
}

/** Mention du fond, toujours visible quand un fond est affiché. */
export function SceneCredit({ backdrop }: { backdrop: SceneBackdrop }) {
  return (
    <span data-testid="scene-credit">
      Fond : {backdrop.credit} · {backdrop.license}
    </span>
  );
}
