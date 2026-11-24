"use client";

import { useBookmarks } from "@/lib/bookmarks";
import { Icon } from "./Icon";
import { useToast } from "./Toast";

type Variant = "rail" | "inline";

export function SaveButton({ slug, title, variant = "inline" }: { slug: string; title: string; variant?: Variant }) {
  const { isSaved, toggle } = useBookmarks();
  const toast = useToast();
  const saved = isSaved(slug);

  return (
    <button
      type="button"
      onClick={() => {
        toggle(slug);
        toast(saved ? "Retiré de vos enregistrements" : "Enregistré pour plus tard");
      }}
      aria-pressed={saved}
      aria-label={saved ? `Retirer « ${title} » des enregistrements` : `Enregistrer « ${title} »`}
      className={buttonClass(variant, saved)}
    >
      <Icon name={saved ? "bookmark-filled" : "bookmark"} className="size-5" />
      <span className={variant === "rail" ? "sr-only" : ""}>{saved ? "Enregistré" : "Enregistrer"}</span>
    </button>
  );
}

export function ShareButton({ slug, title, path, variant = "inline" }: { slug: string; title: string; path?: string; variant?: Variant }) {
  const toast = useToast();

  async function share() {
    const url = `${window.location.origin}${path ?? `/recit/${slug}/`}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} — MUNDI`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast("Lien copié");
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError") toast("Impossible de partager ce lien");
    }
  }

  return (
    <button type="button" onClick={share} aria-label={`Partager « ${title} »`} className={buttonClass(variant, false)}>
      <Icon name="share" className="size-5" />
      <span className={variant === "rail" ? "sr-only" : ""}>Partager</span>
    </button>
  );
}

function buttonClass(variant: Variant, active: boolean) {
  // « rail » : bouton-icône sur le fond nuit du Fil (le nom accessible est porté par aria-label).
  if (variant === "rail") {
    return `flex size-10 items-center justify-center rounded-sm transition-colors ${
      active ? "text-brick-light" : "text-ivory/85 hover:text-ivory"
    }`;
  }
  return `btn btn-secondary ${active ? "border-accent text-accent" : ""}`;
}
