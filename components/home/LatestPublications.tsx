"use client";

import { useEffect, useRef, useState } from "react";
import { HOME_BATCH, type HomeItem } from "@/lib/home";
import { HomeRow } from "./HomeRow";

type Saved = { count: number; y: number };
/** Repère posé sur l'entrée d'historique de l'accueil : présent seulement quand on y revient. */
const STATE_KEY = "mundiHome";

/**
 * « Dernières publications » : un premier lot dans la page (HTML léger), puis
 * les lots suivants lus dans /accueil.json à la demande.
 * Retour arrière : l'accueil retrouve le nombre de lots ouverts et la position.
 */
export function LatestPublications({ initial, total, exclude }: { initial: HomeItem[]; total: number; exclude: string[] }) {
  const [items, setItems] = useState(initial);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const all = useRef<HomeItem[] | null>(null);
  const list = useRef<HTMLUListElement>(null);

  async function load(count: number) {
    if (!all.current) {
      const res = await fetch("/accueil.json");
      if (!res.ok) throw new Error(String(res.status));
      const skip = new Set(exclude);
      all.current = ((await res.json()) as { items: HomeItem[] }).items.filter((i) => !skip.has(i.slug));
    }
    setItems(all.current.slice(0, count));
  }

  async function more() {
    setStatus("loading");
    try {
      await load(items.length + HOME_BATCH);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  // Avant d'ouvrir une publication : mémoriser la position sur cette entrée d'historique.
  useEffect(() => {
    const root = list.current?.closest("[data-home]");
    if (!root) return;
    const onClick = (e: Event) => {
      if (!(e.target as HTMLElement).closest("a[href]")) return;
      try {
        const saved: Saved = { count: list.current?.children.length ?? HOME_BATCH, y: window.scrollY };
        window.history.replaceState({ ...window.history.state, [STATE_KEY]: saved }, "");
      } catch {
        /* historique indisponible : on repartira du haut */
      }
    };
    root.addEventListener("click", onClick, true);
    return () => root.removeEventListener("click", onClick, true);
  }, []);

  // Retour sur l'accueil : rouvrir les lots déjà affichés, puis revenir à la position.
  useEffect(() => {
    const saved = (window.history.state?.[STATE_KEY] ?? null) as Saved | null;
    if (!saved) return;
    let cancelled = false;
    const restore = () => !cancelled && window.scrollTo({ top: saved.y, behavior: "instant" as ScrollBehavior });
    (saved.count > initial.length ? load(saved.count) : Promise.resolve())
      .then(() => requestAnimationFrame(() => requestAnimationFrame(restore)))
      .catch(restore);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const left = total - items.length;
  return (
    <>
      <ul ref={list} data-testid="home-latest" className="mt-2">
        {items.map((item) => (
          <HomeRow key={item.slug} item={item} />
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2" aria-live="polite">
        {left > 0 && (
          <button type="button" onClick={more} disabled={status === "loading"} className="btn btn-secondary min-h-11" data-testid="home-more">
            {status === "loading" ? "Chargement…" : `Afficher ${Math.min(left, HOME_BATCH)} de plus`}
          </button>
        )}
        <p className="text-meta text-muted" data-testid="home-latest-count">
          {items.length} sur {total} publication{total > 1 ? "s" : ""}
        </p>
        {status === "error" && <p className="w-full text-sm text-ink">Impossible de charger la suite. Vérifiez la connexion, puis réessayez.</p>}
      </div>
    </>
  );
}
