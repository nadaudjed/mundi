import { focusPosition, type SceneBackdrop, type SceneRef } from "@/lib/scenes";

/**
 * Fond approuvé (registre content/scenes.json, contrôlé au build), affiché
 * immobile dans la zone qui le contient. Purement décoratif : masqué aux
 * lecteurs d'écran, il ne porte aucune donnée.
 */
export function SceneLayer({ backdrop, focus }: { backdrop: SceneBackdrop; focus?: SceneRef["focus"]; active?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-testid="scene-backdrop" data-backdrop={backdrop.id}>
      <div className="scene-image absolute inset-0 bg-cover" style={{ backgroundImage: `url("${backdrop.src}")`, backgroundPosition: focusPosition(focus) }} />
      {/* Voile uni (sans dégradé) pour garder le texte lisible. */}
      <div className="absolute inset-0 bg-night/70" />
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
