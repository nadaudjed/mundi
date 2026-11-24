"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { VideoMedia } from "@/lib/media";
import { Icon } from "./Icon";

type Props = {
  media: VideoMedia;
  active: boolean;
  near: boolean;
  reducedMotion: boolean;
  /** Économie de données ou réseau très lent : pas de lecture automatique. */
  saveData?: boolean;
  /** Visuel de secours si la vidéo ET son image d'aperçu sont indisponibles. */
  fallback: ReactNode;
};

/**
 * Courte vidéo de fond de carte.
 * - Toujours muette au départ : le son n'est activé que par un geste explicite.
 * - Lecture automatique seulement quand la carte est visible, sans réduction
 *   des animations ni économie de données.
 * - Chargement différé : la source n'est attachée qu'aux cartes proches.
 * - Sous-titres affichés par défaut, désactivables.
 * - En cas d'erreur : image d'aperçu + message + « Réessayer » ; le fil continue.
 */
export function VideoCard({ media, active, near, reducedMotion, saveData = false, fallback }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [userStarted, setUserStarted] = useState(false);
  const [muted, setMuted] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [cue, setCue] = useState("");
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const autoplay = !reducedMotion && !saveData;
  // En économie de données, rien n'est téléchargé avant un geste de la personne.
  const load = near && (!saveData || userStarted);

  // Lecture / pause selon la visibilité de la carte.
  useEffect(() => {
    const el = video.current;
    if (!el || failed) return;
    if (active && (autoplay || userStarted) && !userPaused) {
      el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [active, autoplay, userStarted, userPaused, load, failed]);

  // Quand la carte sort de l'écran : on recoupe le son et on oublie la pause manuelle
  // (ajustement d'état pendant le rendu, motif recommandé par React).
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) {
      setUserPaused(false);
      setMuted(true);
    }
  }

  // Sous-titres : on lit la piste WebVTT et on affiche la réplique en cours.
  useEffect(() => {
    const el = video.current;
    if (!el || !load) return;
    const track = el.textTracks[0];
    if (!track) return;
    track.mode = "hidden";
    const onCue = () => {
      const current = track.activeCues?.[0] as VTTCue | undefined;
      setCue(current?.text ?? "");
    };
    track.addEventListener("cuechange", onCue);
    return () => track.removeEventListener("cuechange", onCue);
  }, [load, attempt]);

  // Erreur de chargement : avec des <source>, l'erreur arrive sur la dernière source.
  useEffect(() => {
    const el = video.current;
    if (!el || !load) return;
    const sources = el.querySelectorAll("source");
    const last = sources[sources.length - 1];
    const onError = () => setFailed(true);
    last?.addEventListener("error", onError);
    el.addEventListener("error", onError);
    return () => {
      last?.removeEventListener("error", onError);
      el.removeEventListener("error", onError);
    };
  }, [load, attempt]);

  // Espace = lecture/pause de la vidéo visible.
  useEffect(() => {
    if (!active || failed) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== " " || (e.target as HTMLElement).closest("input, textarea, button, a, [contenteditable]")) return;
      e.preventDefault();
      toggle();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function toggle() {
    const el = video.current;
    if (!el) return;
    if (el.paused) {
      setUserPaused(false);
      setUserStarted(true);
      // Si la source n'est pas encore attachée (économie de données), l'effet
      // de lecture démarrera la vidéo dès qu'elle le sera.
      el.play().catch(() => setPlaying(false));
    } else {
      setUserPaused(true);
      el.pause();
    }
  }

  function retry() {
    setFailed(false);
    setAttempt((a) => a + 1);
    setUserStarted(true);
  }

  if (failed) {
    return (
      <div className="absolute inset-0 bg-night" data-media="video" data-state="error">
        {posterFailed ? (
          fallback
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.poster} alt="" className="h-full w-full object-cover opacity-70" onError={() => setPosterFailed(true)} />
        )}
        <div
          role="status"
          className="absolute inset-x-4 top-16 z-10 flex items-center gap-3 rounded-md bg-night p-3 text-sm text-ivory ring-1 ring-amber/40"
        >
          <Icon name="alert" className="size-5 shrink-0 text-amber" />
          <span className="flex-1">Vidéo indisponible pour le moment. Le récit reste lisible ci-dessous.</span>
          <button type="button" onClick={retry} className="inline-flex items-center gap-1 rounded-sm border border-ivory/40 px-3 py-1 text-xs font-semibold hover:border-ivory">
            <Icon name="refresh" className="size-3.5" />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-night" data-media="video" data-state={playing ? "playing" : "paused"}>
      {posterFailed && <div className="absolute inset-0">{fallback}</div>}
      <video
        key={attempt}
        ref={video}
        className="relative h-full w-full object-contain"
        poster={posterFailed || !near ? undefined : media.poster}
        muted={muted}
        playsInline
        loop
        preload={load ? "metadata" : "none"}
        aria-label={media.description}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || media.durationSeconds))}
        onClick={toggle}
      >
        {load && media.sources.map((s) => <source key={s.src} src={s.src} type={s.type} />)}
        {load && <track kind="captions" src={media.captions.src} srcLang={media.captions.srclang} label={media.captions.label} default />}
      </video>
      {/* Détection d'une image d'aperçu manquante (la balise vidéo ne le signale pas). */}
      {near && !posterFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.poster} alt="" aria-hidden="true" className="hidden" onError={() => setPosterFailed(true)} />
      )}

      {captionsOn && cue && (
        <p className="pointer-events-none absolute inset-x-4 bottom-4 z-10 text-center wide:bottom-12" aria-hidden="true">
          <span className="box-decoration-clone rounded-xs bg-night/90 px-2 py-1 text-[0.9rem] leading-[1.65] font-medium text-ivory">{cue}</span>
        </p>
      )}

      {saveData && !userStarted && active && (
        <p className="absolute inset-x-4 top-16 z-10 rounded-md bg-night p-3 text-center text-sm text-ivory" data-testid="save-data-note">
          Économie de données : touchez ▶ pour lancer la vidéo.
        </p>
      )}

      <div className="absolute top-3 left-4 z-10 flex gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={playing}
          aria-label={playing ? "Mettre la vidéo en pause" : "Lire la vidéo"}
          className="flex size-10 items-center justify-center rounded-sm bg-night text-ivory ring-1 ring-ivory/20 hover:ring-ivory/60"
          data-testid="video-toggle"
        >
          <Icon name={playing ? "pause" : "play"} className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setCaptionsOn((c) => !c)}
          aria-pressed={captionsOn}
          aria-label={captionsOn ? "Masquer les sous-titres" : "Afficher les sous-titres"}
          className={`flex size-10 items-center justify-center rounded-sm ring-1 ${captionsOn ? "bg-ivory text-night ring-ivory" : "bg-night text-ivory ring-ivory/20"}`}
        >
          <Icon name="captions" className="size-5" />
        </button>
        {media.hasAudio && (
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-pressed={!muted}
            aria-label={muted ? "Activer le son" : "Couper le son"}
            className="flex size-10 items-center justify-center rounded-sm bg-night text-ivory ring-1 ring-ivory/20 hover:ring-ivory/60"
          >
            <Icon name={muted ? "volume-off" : "volume"} className="size-5" />
          </button>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-ivory/10" aria-hidden="true">
        <div className="h-full bg-ivory" style={{ width: `${Math.min(100, progress * 100)}%` }} />
      </div>
      {!autoplay && !playing && (
        <p className="sr-only">
          {saveData
            ? "Lecture automatique désactivée pour économiser vos données."
            : "Lecture automatique désactivée car votre appareil demande de réduire les animations."}
        </p>
      )}
    </div>
  );
}
