import type { ElementType } from "react";

/**
 * Titre d'une carte du fil. L'ancienne révélation mot à mot (animation
 * décorative) a été retirée : le texte s'affiche tel quel, tout de suite.
 */
export function RevealWords({ text, as: Tag = "span", className, id }: { text: string; as?: ElementType; className?: string; id?: string; active?: boolean }) {
  return (
    <Tag id={id} className={className}>
      {text}
    </Tag>
  );
}
