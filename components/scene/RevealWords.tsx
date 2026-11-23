import { Fragment, type ElementType } from "react";

/**
 * Révélation typographique mot à mot (ticket #30).
 * Le texte reste un seul titre, lisible tel quel par les lecteurs d'écran ;
 * seuls des <span> l'enveloppent. L'animation ne se déclenche que sur la scène
 * active (attribut `data-reveal`), une fois la page prête (`data-motion="ready"`
 * sur le fil) et si l'appareil autorise les animations. Sinon, tout est visible.
 * Aucun chiffre n'est animé : les valeurs restent fixes (pas de compteur).
 */
export function RevealWords({ text, as: Tag = "span", className, id, active }: { text: string; as?: ElementType; className?: string; id?: string; active: boolean }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <Tag id={id} className={className} data-reveal={active ? "on" : "off"}>
      {words.map((w, i) => (
        // L'espace reste HORS du mot (inline-block) : sinon il disparaît à l'affichage.
        <Fragment key={i}>
          <span className="reveal-word" style={{ ["--i" as string]: Math.min(i, 10) }}>
            {w}
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Tag>
  );
}
