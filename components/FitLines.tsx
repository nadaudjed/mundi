"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Texte qui occupe la place restante et s'arrête sur une ligne entière, terminée par « … ».
 * Le conteneur extérieur mesure la place disponible ; le paragraphe est limité à un
 * nombre entier de lignes (aucune ligne coupée à mi-hauteur). Sans place, il est masqué.
 */
export function FitLines({ children, className = "", testId }: { children: React.ReactNode; className?: string; testId?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const outer = box.current;
    const el = text.current;
    if (!outer || !el) return;
    const fit = () => {
      if (getComputedStyle(el).display === "block") {
        // Écran large : texte complet.
        el.style.removeProperty("-webkit-line-clamp");
        el.style.removeProperty("max-height");
        el.hidden = false;
        return;
      }
      const line = parseFloat(getComputedStyle(el).lineHeight) || 20;
      // Tolérance de quelques pixels : seul l'interligne vide de la dernière ligne peut être rogné.
      const lines = Math.floor((outer.clientHeight + 4) / line);
      el.hidden = lines < 1;
      el.style.setProperty("-webkit-line-clamp", String(Math.max(1, lines)));
      el.style.maxHeight = `${Math.max(1, lines) * line}px`;
    };
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(fit);
    ro.observe(outer);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className={`fit-lines-box ${className}`}>
      <p ref={text} data-testid={testId} className="fit-lines">
        {children}
      </p>
    </div>
  );
}
