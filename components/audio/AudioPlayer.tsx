"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Lecteur audio partagé (pilote « Aujourd'hui », ticket 109).
 *
 * Un seul élément <audio> pour tout le site, posé dans la mise en page : il survit aux
 * navigations internes (Fil → article → Réviser…), et le mini-lecteur reste visible en bas
 * de l'écran tant qu'une piste est chargée. Lecture uniquement après un appui (exigence
 * iPhone et Android) ; une autre piste remplace la précédente ; un fichier introuvable
 * passe en « erreur » et le bouton Écouter propose la voix du téléphone en secours.
 */
export type Track = { src: string; title: string; href?: string };
export type PlayerPhase = "idle" | "starting" | "playing" | "paused" | "error";
export type PlayerState = { track: Track | null; phase: PlayerPhase; time: number; duration: number };

type Player = PlayerState & {
  /** Lit la piste (depuis un appui), ou met en pause / reprend si c'est déjà elle. */
  toggle: (track: Track) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (delta: number) => void;
  /** Appelé quand la voix du téléphone prend la main : un seul son à la fois. */
  onExternalStart: (stopOther: () => void) => void;
};

const IDLE: PlayerState = { track: null, phase: "idle", time: 0, duration: 0 };
const PlayerContext = createContext<Player | null>(null);

export function usePlayer(): Player | null {
  return useContext(PlayerContext);
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState>(IDLE);
  const audio = useRef<HTMLAudioElement | null>(null);
  const external = useRef<(() => void) | null>(null);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const element = useCallback(() => {
    if (audio.current) return audio.current;
    const a = new Audio();
    a.preload = "auto";
    a.setAttribute("playsinline", "");
    a.onplaying = () => setState((s) => (s.track ? { ...s, phase: "playing" } : s));
    a.onwaiting = () => setState((s) => (s.track && s.phase === "playing" ? { ...s, phase: "starting" } : s));
    a.onpause = () => setState((s) => (s.track && !a.ended && s.phase !== "error" ? { ...s, phase: "paused" } : s));
    a.ontimeupdate = () => setState((s) => (s.track ? { ...s, time: a.currentTime, duration: Number.isFinite(a.duration) ? a.duration : s.duration } : s));
    a.onloadedmetadata = () => setState((s) => (s.track ? { ...s, duration: Number.isFinite(a.duration) ? a.duration : 0 } : s));
    // Fin de piste : le lecteur se referme et les boutons reviennent à « Écouter ».
    a.onended = () => setState(IDLE);
    a.onerror = () => {
      if (!a.getAttribute("src")) return;
      setState((s) => (s.track ? { ...s, phase: "error" } : s));
    };
    audio.current = a;
    return a;
  }, []);

  const mediaSession = useCallback((track: Track, a: HTMLAudioElement) => {
    try {
      const ms = navigator.mediaSession;
      if (!ms || !("MediaMetadata" in window)) return;
      ms.metadata = new MediaMetadata({ title: track.title, artist: "MUNDI", artwork: [{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }] });
      ms.setActionHandler("play", () => void a.play());
      ms.setActionHandler("pause", () => a.pause());
    } catch { /* lecture sans commandes d'écran verrouillé */ }
  }, []);

  const play = useCallback((track: Track) => {
    external.current?.();
    external.current = null;
    const a = element();
    if (a.getAttribute("src") !== track.src) {
      a.setAttribute("src", track.src);
      try { a.load(); } catch { /* ignore */ }
    }
    mediaSession(track, a);
    setState({ track, phase: "starting", time: 0, duration: 0 });
    // play() part directement du toucher : c'est ce qu'exigent Safari iPhone et Chrome Android.
    a.play().catch((e: unknown) => {
      if (e instanceof DOMException && e.name === "NotAllowedError") { setState((s) => ({ ...s, phase: "paused" })); return; }
      if (e instanceof DOMException && e.name === "AbortError") return; // remplacée par une autre piste
      setState((s) => (s.track?.src === track.src ? { ...s, phase: "error" } : s));
    });
  }, [element, mediaSession]);

  const pause = useCallback(() => { audio.current?.pause(); }, []);
  const resume = useCallback(() => {
    const a = audio.current;
    if (!a || !stateRef.current.track) return;
    external.current?.();
    external.current = null;
    setState((s) => ({ ...s, phase: "starting" }));
    a.play().catch(() => setState((s) => ({ ...s, phase: "paused" })));
  }, []);
  const stop = useCallback(() => {
    const a = audio.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      try { a.load(); } catch { /* ignore */ }
    }
    setState(IDLE);
  }, []);
  const seek = useCallback((delta: number) => {
    const a = audio.current;
    if (!a || !Number.isFinite(a.duration)) return;
    a.currentTime = Math.max(0, Math.min(a.duration - 0.1, a.currentTime + delta));
  }, []);

  const toggle = useCallback((track: Track) => {
    const s = stateRef.current;
    if (s.track?.src === track.src && s.phase !== "error") {
      if (s.phase === "playing" || s.phase === "starting") pause();
      else resume();
      return;
    }
    play(track);
  }, [pause, play, resume]);

  const onExternalStart = useCallback((stopOther: () => void) => {
    if (stateRef.current.track) stop();
    external.current = stopOther;
  }, [stop]);

  // Fermeture de l'onglet ou de l'app : rien ne reste en lecture fantôme.
  useEffect(() => {
    const onHide = (e: PageTransitionEvent) => { if (!e.persisted) audio.current?.pause(); };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  const value = useMemo<Player>(() => ({ ...state, toggle, pause, resume, stop, seek, onExternalStart }), [state, toggle, pause, resume, stop, seek, onExternalStart]);
  return (
    <PlayerContext.Provider value={value}>
      {children}
      <MiniPlayer />
    </PlayerContext.Provider>
  );
}

export const clock = (t: number) => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");

/** Mini-lecteur : au-dessus de la barre d'onglets sur téléphone, en bas à droite sur grand écran. */
function MiniPlayer() {
  const p = usePlayer();
  if (!p?.track) return null;
  const { track, phase, time, duration } = p;
  const playing = phase === "playing" || phase === "starting";
  const pct = duration ? Math.min(100, (time / duration) * 100) : 0;
  return (
    <div
      data-mini-player
      data-testid="mini-player"
      data-phase={phase}
      role="region"
      aria-label="Lecteur audio"
      className="fixed inset-x-0 bottom-[var(--nav-h)] z-40 border-t border-rule bg-surface text-ink md:inset-x-auto md:right-4 md:bottom-4 md:w-[24rem] md:border"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-rule">
        <span className="block h-full bg-accent transition-[width] duration-500 motion-reduce:transition-none" style={{ width: pct + "%" }} />
      </span>
      <div className="mx-auto flex h-[var(--mini-h)] max-w-[40rem] items-center gap-2 px-3">
        <button
          type="button"
          onClick={() => (phase === "error" ? p.toggle(track) : playing ? p.pause() : p.resume())}
          aria-label={phase === "error" ? "Réessayer la piste" : playing ? "Pause du lecteur" : "Reprendre le lecteur"}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-on-ink"
        >
          <span aria-hidden="true" className={phase === "starting" ? "animate-pulse motion-reduce:animate-none" : ""}>{playing ? "❚❚" : "▶"}</span>
        </button>
        <div className="min-w-0 flex-1" aria-live="polite">
          {track.href ? (
            <Link href={track.href} className="block truncate text-[0.85rem] font-semibold hover:underline">{track.title}</Link>
          ) : (
            <p className="truncate text-[0.85rem] font-semibold">{track.title}</p>
          )}
          <p className="truncate font-mono text-[0.7rem] text-muted" data-testid="mini-player-status">
            {phase === "error"
              ? "Fichier audio introuvable pour le moment"
              : phase === "starting" ? "Chargement…"
              : `${phase === "paused" ? "En pause · " : ""}${clock(time)}${duration ? " / " + clock(duration) : ""}`}
          </p>
        </div>
        <button type="button" onClick={() => p.seek(-15)} aria-label="Reculer de 15 secondes" disabled={phase === "error"}
          className="hidden size-9 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold text-muted hover:text-ink disabled:opacity-40 min-[360px]:flex">
          −15
        </button>
        <button type="button" onClick={p.stop} aria-label="Fermer le lecteur" className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink">
          <span aria-hidden="true" className="text-lg leading-none">×</span>
        </button>
      </div>
    </div>
  );
}
