"use client";

import { useEffect, useRef, useState } from "react";
import type { VideoMedia } from "@/lib/media";
import { Icon } from "./Icon";

type Props = { media: VideoMedia; active: boolean; near: boolean; reducedMotion: boolean };

/**
 * Courte vidéo de fond de carte.
 * - Toujours muette au départ : le son n'est activé que par un geste explicite.
 * - Lecture automatique seulement quand la carte est visible ET que la
 *   personne n'a pas demandé à réduire les animations.
 * - Chargement différé : la source n'est attachée qu'aux cartes proches.
 * - Sous-titres affichés par défaut, désactivables.
 */
export function VideoCard({ media, active, near, reducedMotion }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [cue, setCue] = useState("");
  const [progress, setProgress] = useState(0);

  // Lecture / pause selon la visibilité de la carte.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (active && !reducedMotion && !userPaused) {
      el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [active, reducedMotion, userPaused, near]);

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
    if (!el || !near) return;
    const track = el.textTracks[0];
    if (!track) return;
    track.mode = "hidden";
    const onCue = () => {
      const active = track.activeCues?.[0] as VTTCue | undefined;
      setCue(active?.text ?? "");
    };
    track.addEventListener("cuechange", onCue);
    return () => track.removeEventListener("cuechange", onCue);
  }, [near]);

  // Espace = lecture/pause de la vidéo visible.
  useEffect(() => {
    if (!active) return;
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
      el.play().catch(() => setPlaying(false));
    } else {
      setUserPaused(true);
      el.pause();
    }
  }

  return (
    <div className="absolute inset-0 bg-night" data-media="video">
      <video
        ref={video}
        className="h-full w-full object-cover"
        poster={media.poster}
        muted={muted}
        playsInline
        loop
        preload={near ? "metadata" : "none"}
        aria-label={media.description}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || media.durationSeconds))}
        onClick={toggle}
      >
        {near && media.sources.map((s) => <source key={s.src} src={s.src} type={s.type} />)}
        {near && <track kind="captions" src={media.captions.src} srcLang={media.captions.srclang} label={media.captions.label} default />}
      </video>

      {captionsOn && cue && (
        <p className="pointer-events-none absolute inset-x-6 top-[8.75rem] z-10 text-center md:top-16" aria-hidden="true">
          <span className="box-decoration-clone rounded-lg bg-night/80 px-2 py-1 text-[0.95rem] leading-[1.7] font-medium text-ivory">{cue}</span>
        </p>
      )}

      <div className="absolute top-[5.75rem] left-4 z-10 flex gap-2 md:top-4">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={playing}
          aria-label={playing ? "Mettre la vidéo en pause" : "Lire la vidéo"}
          className="flex size-10 items-center justify-center rounded-full bg-night/70 text-ivory ring-1 ring-ivory/20 backdrop-blur hover:bg-night/90"
          data-testid="video-toggle"
        >
          <Icon name={playing ? "pause" : "play"} className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setCaptionsOn((c) => !c)}
          aria-pressed={captionsOn}
          aria-label={captionsOn ? "Masquer les sous-titres" : "Afficher les sous-titres"}
          className={`flex size-10 items-center justify-center rounded-full ring-1 backdrop-blur ${captionsOn ? "bg-ivory text-night ring-ivory" : "bg-night/70 text-ivory ring-ivory/20"}`}
        >
          <Icon name="captions" className="size-5" />
        </button>
        {media.hasAudio && (
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-pressed={!muted}
            aria-label={muted ? "Activer le son" : "Couper le son"}
            className="flex size-10 items-center justify-center rounded-full bg-night/70 text-ivory ring-1 ring-ivory/20 backdrop-blur hover:bg-night/90"
          >
            <Icon name={muted ? "volume-off" : "volume"} className="size-5" />
          </button>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-ivory/10" aria-hidden="true">
        <div className="h-full bg-mint" style={{ width: `${Math.min(100, progress * 100)}%` }} />
      </div>
      {reducedMotion && !playing && (
        <p className="sr-only">Lecture automatique désactivée car votre appareil demande de réduire les animations.</p>
      )}
    </div>
  );
}
