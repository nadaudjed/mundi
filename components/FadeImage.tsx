"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/** Image qui apparaît en fondu une fois chargée, pour un défilement sans à-coup. */
export function FadeImage({ src, className = "", style }: { src: string; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    // Image déjà en cache : l'événement « load » a pu partir avant l'hydratation.
    if (ref.current?.complete && ref.current.naturalWidth > 0) requestAnimationFrame(() => setLoaded(true));
  }, [src]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt="" decoding="async" onLoad={() => setLoaded(true)} data-loaded={loaded ? "true" : "false"} style={style} className={`photo photo-fade ${className}`} />
  );
}
