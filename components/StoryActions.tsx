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
      <Icon name={saved ? "bookmark-filled" : "bookmark"} className={variant === "rail" ? "size-6" : "size-5"} />
      <span className={variant === "rail" ? "text-[0.68rem] font-medium" : ""}>{saved ? "Enregistré" : "Enregistrer"}</span>
    </button>
  );
}

export function ShareButton({ slug, title, variant = "inline" }: { slug: string; title: string; variant?: Variant }) {
  const toast = useToast();

  async function share() {
    const url = `${window.location.origin}/recit/${slug}/`;
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
      <Icon name="share" className={variant === "rail" ? "size-6" : "size-5"} />
      <span className={variant === "rail" ? "text-[0.68rem] font-medium" : ""}>Partager</span>
    </button>
  );
}

function buttonClass(variant: Variant, active: boolean) {
  if (variant === "rail") {
    return `flex w-16 flex-col items-center gap-1 rounded-2xl py-2 transition-colors ${
      active ? "text-mint" : "text-ivory/85 hover:text-ivory"
    }`;
  }
  return `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
    active ? "border-mint bg-mint/10 text-[#0f6e5b]" : "border-night/15 text-night hover:border-night/40"
  }`;
}
