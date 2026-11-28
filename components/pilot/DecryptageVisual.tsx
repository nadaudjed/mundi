"use client";

import { useEffect, useRef, useState } from "react";
import type { Decryptage, DecryptageVisual as Visual } from "@/lib/decryptage";
import type { EditorialPhoto } from "@/lib/editorial-images";
import { TypeCover } from "../TypeCover";
import { MundiCover } from "../MundiCover";
import type { FeedPublication } from "@/lib/verified";
import { TextileChart } from "./TextileChart";

/**
 * Visuel d'un sujet du pilote, directement lié au sujet : carte, graphique ou archive.
 * Repli : si l'image ne se charge pas (ou s'il n'y a pas de visuel pertinent),
 * une couverture typographique prend sa place, jamais une photo hors sujet.
 */
export function DecryptageVisual({ decryptage, photo, word, variant, publication }: {
  decryptage?: Decryptage; photo?: EditorialPhoto; word: string; variant: "card" | "article";
  /** Avec la publication, le repli est une couverture MUNDI (ticket 136) plutôt qu'un simple mot. */
  publication?: FeedPublication;
}) {
  const v = decryptage?.visual;
  const [broken, setBroken] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // L'image a pu échouer avant que la page ne soit interactive : « error » est alors déjà passé.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth === 0) queueMicrotask(() => setBroken(true));
  }, []);
  if (!v || broken || (v.type === "archive" && !photo)) {
    const box = variant === "card" ? "absolute inset-0" : "relative aspect-[3/2] w-full";
    return publication ? <MundiCover publication={publication} tone="paper" className={box} /> : <TypeCover word={word} tone="paper" className={box} />;
  }
  if (v.type === "graphique") return <TextileChart visual={v} compact={variant === "card"} />;
  const src = v.type === "carte" ? `/media/pilote/${v.id}-carte.svg` : photo!.src;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={img}
      src={src}
      alt={v.alt}
      onError={() => setBroken(true)}
      data-testid="decryptage-visual"
      data-visual={v.type}
      loading={variant === "card" ? "eager" : "lazy"}
      className={
        variant === "card"
          ? `absolute inset-0 h-full w-full object-cover ${v.type === "carte" ? "bg-[#d9e1de] object-[62%_58%] wide:object-contain! wide:object-center!" : ""}`
          : `w-full ${v.type === "carte" ? "bg-[#d9e1de]" : "aspect-[3/2] object-cover"}`
      }
    />
  );
}

/** Crédit, licence et légende du visuel, adaptés à sa nature. */
export function VisualCredit({ visual, photo }: { visual: Visual; photo?: EditorialPhoto }) {
  if (visual.type === "archive") {
    if (!photo) return null;
    return (
      <span data-testid="visual-credit">
        Photo d&apos;archive : {photo.credit} ·{" "}
        <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{photo.license}</a> ·{" "}
        <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Wikimedia Commons</a>
      </span>
    );
  }
  return <span data-testid="visual-credit">{visual.credit} · {visual.license}</span>;
}
