"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Speech synthesis is device-generated, not an MP3 or streamed recording. */
type Props = { title: string; summary: string; points: string[]; active?: boolean; tone?: "dark" | "light" };
type Phase = "idle" | "starting" | "speaking";
type Playback = { utterance: SpeechSynthesisUtterance | null; watchdog: number | null };

// The browser has a SINGLE global speech engine. Switching cards or pressing
// "Écouter" somewhere else must stop the previous owner and reset its UI.
let stopOtherPlayback: (() => void) | null = null;

/** Keep each utterance short enough for mobile Safari and Android TTS engines. */
function speechChunks(parts: string[], limit = 240): string[] {
  const result: string[] = [];
  let chunk = "";
  for (const part of parts) {
    const words = part.trim().split(/\s+/).filter(Boolean);
    for (const word of words) {
      if (chunk && chunk.length + 1 + word.length > limit) {
        result.push(chunk);
        chunk = "";
      }
      if (word.length > limit) {
        if (chunk) { result.push(chunk); chunk = ""; }
        for (let n = 0; n < word.length; n += limit) result.push(word.slice(n, n + limit));
      } else chunk += (chunk ? " " : "") + word;
    }
    // Short standalone paragraph boundary, but never an overlong utterance.
    if (chunk.length > 140) { result.push(chunk); chunk = ""; }
  }
  if (chunk) result.push(chunk);
  return result;
}

function speechError(code: string): string {
  switch (code) {
    case "not-allowed":
      return "Le navigateur a refusé la lecture vocale. Touchez de nouveau Écouter depuis Safari ou Chrome.";
    case "language-unavailable":
    case "voice-unavailable":
      return "Aucune voix française disponible. Vérifiez les voix installées dans les réglages de votre téléphone.";
    case "audio-busy":
    case "audio-hardware":
      return "La sortie audio est occupée ou indisponible. Vérifiez le volume, le Bluetooth et réessayez.";
    case "network":
      return "La voix de votre appareil nécessite une connexion. Vérifiez le réseau puis réessayez.";
    default:
      return "La lecture vocale n'a pas démarré. Vérifiez le volume et la sortie Bluetooth, puis réessayez.";
  }
}

export function ListenButton({ title, summary, points, active = true, tone = "dark" }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const playback = useRef<Playback | null>(null);

  const stop = useCallback((update = true) => {
    const session = playback.current;
    if (!session) return;
    playback.current = null;
    if (stopOtherPlayback === stop) stopOtherPlayback = null;
    if (session.watchdog !== null) window.clearTimeout(session.watchdog);
    try { window.speechSynthesis?.cancel(); } catch { /* browser or OS already stopped it */ }
    if (update) {
      setPhase("idle");
      setError("");
    }
  }, []);

  useEffect(() => {
    // Feed cards can stay mounted while hidden. A hidden card must not continue
    // speaking and must release ownership of the global speech engine.
    if (!active) {
      stop(false);
      // Reconcile the button UI without updating React state synchronously in an effect.
      queueMicrotask(() => setPhase("idle"));
    }
    return () => stop(false);
  }, [active, stop]);

  function toggle() {
    if (playback.current) {
      stop();
      return;
    }
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setError("Lecture vocale indisponible sur ce navigateur. Ouvrez MUNDI dans Safari ou Chrome.");
      setPhase("idle");
      return;
    }
    const synth = window.speechSynthesis;
    if (stopOtherPlayback) stopOtherPlayback();

    const chunks = speechChunks([
      title, summary, "Trois points à retenir.",
      ...points.map((point, index) => "Point " + (index + 1) + ". " + point),
    ]);
    if (!chunks.length) {
      setError("Aucun texte à lire sur cette carte.");
      return;
    }

    let index = 0;
    const session: Playback = { utterance: null, watchdog: null };
    playback.current = session;
    stopOtherPlayback = stop;
    setError("");
    setPhase("starting");

    const fail = (reason: string) => {
      if (playback.current !== session) return;
      stop(false);
      setPhase("idle");
      setError(speechError(reason));
    };
    const finish = () => {
      if (playback.current !== session) return;
      playback.current = null;
      if (stopOtherPlayback === stop) stopOtherPlayback = null;
      if (session.watchdog !== null) window.clearTimeout(session.watchdog);
      setPhase("idle");
      setError("");
    };
    const next = () => {
      if (playback.current !== session) return;
      if (session.watchdog !== null) {
        window.clearTimeout(session.watchdog);
        session.watchdog = null;
      }
      const text = chunks[index++];
      if (!text) { finish(); return; }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.rate = 0.94;
      utterance.volume = 1;
      // getVoices may be empty until voiceschanged, especially on iOS. Let the
      // browser use its default voice rather than blocking a user gesture.
      try {
        const voices = synth.getVoices();
        const voice = voices.find((v) => v.lang.toLowerCase() === "fr-fr") ??
          voices.find((v) => v.lang.toLowerCase().startsWith("fr"));
        if (voice) utterance.voice = voice;
      } catch { /* use the OS default voice */ }

      session.utterance = utterance; // Keep a strong reference on iOS Safari.
      let started = false;
      utterance.onstart = () => {
        if (playback.current !== session) return;
        started = true;
        if (session.watchdog !== null) window.clearTimeout(session.watchdog);
        session.watchdog = null;
        setPhase("speaking");
      };
      utterance.onend = () => {
        if (playback.current !== session) return;
        // The next chunk is only queued once the current one has ended.
        next();
      };
      utterance.onerror = (event) => {
        if (playback.current !== session) return;
        if (event.error === "canceled" || event.error === "interrupted") {
          fail(event.error);
          return;
        }
        fail(event.error || "unknown");
      };
      session.watchdog = window.setTimeout(() => {
        if (playback.current !== session || started) return;
        // Some WebKit versions omit onstart even while producing sound.
        if (synth.speaking) { setPhase("speaking"); return; }
        fail("not-allowed");
      }, 8000);
      try {
        synth.speak(utterance); // Synchronous: retain the user gesture on iOS.
      } catch {
        fail("synthesis-failed");
      }
    };

    // Avoid cancelling an idle iOS speech engine immediately before speak().
    try {
      if (synth.speaking || synth.pending || synth.paused) synth.cancel();
      next();
    } catch { fail("synthesis-unavailable"); }
  }

  const playing = active && (phase === "starting" || phase === "speaking");
  return (
    <span className="inline-flex max-w-full flex-col items-start gap-1.5">
      <button type="button" onClick={toggle}
        aria-label={playing ? "Arrêter la lecture audio" : "Écouter le résumé"}
        aria-pressed={playing}
        title="Lecture vocale par le navigateur ; aucune piste audio téléchargée"
        className={"inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint " +
          (tone === "light" ? "border-night/15 py-2 text-night hover:border-night/40" : "border-ivory/35 text-ivory hover:border-ivory/80")}>
        <span aria-hidden="true">{playing ? "■" : "▶"}</span>
        {playing ? "Arrêter" : error ? "Réessayer l'audio" : "Écouter"}
      </button>
      {phase === "starting" && playing && <span role="status" className={"max-w-64 text-xs " + (tone === "light" ? "text-muted" : "text-ivory/80")}>Préparation de la voix française…</span>}
      {error && <span role="status" className={"max-w-72 text-xs leading-relaxed " + (tone === "light" ? "text-[#79571c]" : "text-[#ffd98f]")}>{error}</span>}
    </span>
  );
}
