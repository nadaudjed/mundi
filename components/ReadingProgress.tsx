"use client";

import { useEffect, useRef } from "react";

/**
 * Barre de progression de lecture, en haut de l'écran (sous l'en-tête sur ordinateur).
 * Elle suit le défilement sans animation propre : elle reste donc sobre même
 * quand le lecteur demande de réduire les animations.
 */
export function ReadingProgress({ target = "article" }: { target?: string }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(target);
    if (!el || !bar.current) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const ratio = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
      bar.current?.style.setProperty("--progress", ratio.toFixed(4));
      bar.current?.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target]);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[var(--header-h)] z-40 h-[3px]" aria-hidden="true">
      <div ref={bar} className="reading-progress h-full bg-accent" role="progressbar" aria-label="Progression de lecture" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} data-testid="reading-progress" />
    </div>
  );
}
