"use client";

import { useEffect, useRef, useState } from "react";

/** tone « dark » : sur fond sombre (fil) ; « light » : sur fond clair (pages). */
type Props = { title: string; summary: string; points: string[]; active?: boolean; tone?: "dark" | "light" };

export function ListenButton({ title, summary, points, active = true, tone = "dark" }: Props) {
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(true);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!active && utterance.current && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      utterance.current = null;
    }
    return () => {
      if (utterance.current && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        utterance.current = null;
      }
    };
  }, [active]);

  function toggle() {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setSupported(false);
      return;
    }
    if (playing) {
      window.speechSynthesis.cancel();
      utterance.current = null;
      setPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(
      [title, summary, "Trois points à retenir.", ...points.map((p, i) => "Point " + (i + 1) + ". " + p)].join(" ")
    );
    speech.lang = "fr-FR";
    speech.rate = 0.95;
    const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith("fr"));
    if (voice) speech.voice = voice;
    speech.onend = () => { if (utterance.current === speech) { utterance.current = null; setPlaying(false); } };
    speech.onerror = () => { if (utterance.current === speech) { utterance.current = null; setPlaying(false); } };
    utterance.current = speech;
    setPlaying(true);
    window.speechSynthesis.speak(speech);
  }

  return (
    <button type="button" onClick={toggle}
      aria-label={playing ? "Arrêter la lecture audio" : "Écouter le résumé"}
      aria-pressed={playing}
      title="Voix synthétique de votre appareil"
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint ${tone === "light" ? "border-night/15 py-2 text-night hover:border-night/40" : "border-ivory/35 text-ivory hover:border-ivory/80"}`}>
      <span aria-hidden="true">{playing ? "■" : "▶"}</span>
      {supported ? (playing ? "Arrêter" : "Écouter") : "Audio indisponible"}
    </button>
  );
}
