"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** Image qui apparaît en fondu une fois chargée, pour un défilement sans à-coup. */
export function FadeImage({ src, className = "", style, fallback }: { src: string; className?: string; style?: CSSProperties; /** Remplace l'image si elle ne se charge pas. */ fallback?: ReactNode }) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState<string | null>(null);
  const hasFallback = fallback != null;
  useEffect(() => {
    const el = ref.current;
    // Image déjà en cache : l'événement « load » a pu partir avant l'hydratation (ou « error »).
    if (el?.complete && el.naturalWidth > 0) requestAnimationFrame(() => setLoaded(true));
    else if (el?.complete && hasFallback) requestAnimationFrame(() => setBroken(src));
  }, [src, hasFallback]);
  if (fallback && broken === src) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt="" decoding="async" onLoad={() => setLoaded(true)} onError={() => setBroken(src)} data-loaded={loaded ? "true" : "false"} style={style} className={`photo photo-fade ${className}`} />
  );
}
