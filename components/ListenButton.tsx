"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * « Écouter » : lecture du résumé par la voix de l'appareil (speechSynthesis),
 * sans fichier audio téléchargé. Lecture / pause / reprise / arrêt.
 *
 * Pièges mobiles traités ici (surtout iPhone, Safari et app installée) :
 * - le premier speak() doit partir directement du toucher, sans attente ;
 * - le bouton « silencieux » de l'iPhone coupe la voix web : on bascule la
 *   session audio en mode lecture (audioSession, sinon un son muet joué au toucher) ;
 * - speak() juste après cancel() est parfois ignoré : on laisse un court délai
 *   et un chien de garde relance une fois une lecture qui ne démarre pas ;
 * - pause()/resume() natifs sont peu fiables (Android, iOS) : la pause arrête
 *   la voix et la reprise relit depuis le passage en cours ;
 * - quand l'app passe en arrière-plan, la voix peut s'arrêter sans prévenir :
 *   au retour, l'état passe en « pause » plutôt que de rester bloqué.
 */
type Props = { title: string; summary: string; points: string[]; active?: boolean; tone?: "dark" | "light" };
type Phase = "idle" | "starting" | "speaking" | "paused";
type Session = {
  chunks: string[];
  index: number;
  utterance: SpeechSynthesisUtterance | null;
  watchdog: number | null;
  retried: boolean;
};

// Le navigateur n'a qu'UN moteur vocal : écouter une autre carte arrête la précédente.
let currentOwner: { session: Session; stop: () => void } | null = null;

/** Passages courts : les moteurs mobiles décrochent sur les textes longs. */
export function speechChunks(parts: string[], limit = 220): string[] {
  const result: string[] = [];
  for (const part of parts) {
    const sentences = part.trim().replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]*\s*/g) ?? [];
    let chunk = "";
    for (const raw of sentences) {
      const sentence = raw.trim();
      if (!sentence) continue;
      if (chunk && chunk.length + 1 + sentence.length > limit) { result.push(chunk); chunk = ""; }
      if (sentence.length <= limit) { chunk += (chunk ? " " : "") + sentence; continue; }
      for (const word of sentence.split(" ")) {
        if (chunk && chunk.length + 1 + word.length > limit) { result.push(chunk); chunk = ""; }
        if (word.length > limit) {
          for (let n = 0; n < word.length; n += limit) result.push(word.slice(n, n + limit));
        } else chunk += (chunk ? " " : "") + word;
      }
    }
    if (chunk) result.push(chunk);
  }
  return result;
}

function speechError(code: string): string {
  switch (code) {
    case "language-unavailable":
    case "voice-unavailable":
      return "Aucune voix française disponible. Ajoutez-en une dans les réglages de votre téléphone (Accessibilité, Contenu énoncé, Voix).";
    case "audio-busy":
    case "audio-hardware":
      return "La sortie audio est occupée. Vérifiez le volume et le Bluetooth, puis réessayez.";
    case "network":
      return "La voix de votre appareil a besoin d'une connexion. Vérifiez le réseau, puis réessayez.";
    case "unsupported":
      return "Lecture vocale indisponible sur ce navigateur. Ouvrez MUNDI dans Safari ou Chrome.";
    default:
      return "La voix n'a pas démarré. Montez le volume, puis touchez Réessayer.";
  }
}

/** Voix française de qualité si l'appareil en propose une ; sinon la voix par défaut pour fr-FR. */
function frenchVoice(): SpeechSynthesisVoice | undefined {
  try {
    const voices = window.speechSynthesis.getVoices().filter((v) => /^fr[-_]fr$/i.test(v.lang));
    // Les voix « fantaisie » d'iOS (Eddy, Grand-mère…) sont exclues ; on ne force une voix
    // que si elle est connue pour être correcte, pour laisser iOS choisir sinon.
    const good = /^(Thomas|Audrey|Amélie|Aurélie|Marie|Google français|Microsoft (Denise|Henri|Julie|Paul))/i;
    return voices.find((v) => v.localService && good.test(v.name)) ?? voices.find((v) => good.test(v.name));
  } catch { return undefined; }
}

let silentAudio: HTMLAudioElement | null = null;
/** iPhone : la voix web respecte le bouton silencieux, sauf si la page joue en mode « lecture ». */
function unlockAudioOutput() {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (nav.audioSession) { nav.audioSession.type = "playback"; return; }
  } catch { /* ignore */ }
  const appleTouch = /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!appleTouch) return;
  try {
    if (!silentAudio) {
      // 0,2 s de silence (WAV 8 kHz 8 bits) généré localement.
      const n = 1600;
      const bytes = new Uint8Array(44 + n);
      const v = new DataView(bytes.buffer);
      const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) bytes[o + i] = s.charCodeAt(i); };
      w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true);
      v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
      v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, "data"); v.setUint32(40, n, true);
      bytes.fill(128, 44);
      let bin = "";
      bytes.forEach((b) => { bin += String.fromCharCode(b); });
      silentAudio = new Audio("data:audio/wav;base64," + btoa(bin));
      silentAudio.setAttribute("playsinline", "");
    }
    silentAudio.currentTime = 0;
    void silentAudio.play().catch(() => { /* sans effet : la voix est quand même tentée */ });
  } catch { /* ignore */ }
}

/** Charge la liste des voix tôt : le premier toucher n'attend rien. */
let voicesWarmed = false;
function warmVoices() {
  if (voicesWarmed || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  voicesWarmed = true;
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", () => window.speechSynthesis.getVoices());
  } catch { /* ignore */ }
}

export function ListenButton({ title, summary, points, active = true, tone = "dark" }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState({ index: 0, total: 0 });
  const [error, setError] = useState("");
  const session = useRef<Session | null>(null);
  const speakNext = useRef<(s: Session) => void>(() => {});

  /** Coupe la voix sans toucher à l'état React (utilisable dans les effets). */
  const release = useCallback(() => {
    const s = session.current;
    if (!s) return false;
    session.current = null;
    if (currentOwner?.session === s) currentOwner = null;
    if (s.watchdog !== null) window.clearTimeout(s.watchdog);
    s.utterance = null;
    try { window.speechSynthesis?.cancel(); } catch { /* déjà arrêté */ }
    return true;
  }, []);

  const stop = useCallback(() => {
    release();
    setPhase("idle");
    setProgress({ index: 0, total: 0 });
  }, [release]);

  const fail = useCallback((code: string) => {
    release();
    setPhase("idle");
    setError(speechError(code));
  }, [release]);

  const pause = useCallback(() => {
    const s = session.current;
    if (!s) return;
    if (s.watchdog !== null) window.clearTimeout(s.watchdog);
    s.watchdog = null;
    s.utterance = null; // les événements « canceled » qui suivent sont ignorés
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    setPhase("paused");
  }, []);

  /** Lit le passage en cours de la session, puis enchaîne les suivants. */
  const speakCurrent = useCallback((s: Session) => {
    if (session.current !== s) return;
    const synth = window.speechSynthesis;
    const text = s.chunks[s.index];
    if (!text) { stop(); return; }
    setProgress({ index: s.index, total: s.chunks.length });

    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 1;
    u.volume = 1;
    const voice = frenchVoice();
    if (voice) u.voice = voice;
    s.utterance = u; // référence forte : sinon iOS peut abandonner la lecture
    let started = false;
    const mine = () => session.current === s && s.utterance === u;

    const markStarted = () => {
      if (!mine() || started) return;
      started = true;
      if (s.watchdog !== null) window.clearTimeout(s.watchdog);
      s.watchdog = null;
      setPhase("speaking");
    };
    u.onstart = markStarted;
    u.onboundary = markStarted;
    u.onend = () => {
      if (!mine()) return;
      if (s.watchdog !== null) window.clearTimeout(s.watchdog);
      s.watchdog = null;
      s.index += 1;
      if (s.index >= s.chunks.length) { stop(); return; }
      speakNext.current(s);
    };
    u.onerror = (event) => {
      if (!mine()) return;
      // Coupure extérieure (appel, Siri, autre onglet) : on propose de reprendre.
      if (event.error === "interrupted" || event.error === "canceled") { pause(); return; }
      fail(event.error || "unknown");
    };

    // Rien après 2,5 s ? Certaines versions de WebKit n'envoient pas onstart alors
    // que la voix parle ; sinon on relance une fois, puis on affiche un message.
    s.watchdog = window.setTimeout(() => {
      if (!mine() || started) return;
      if (synth.speaking && !synth.pending) { markStarted(); return; }
      if (!s.retried) {
        s.retried = true;
        s.utterance = null;
        try { synth.cancel(); } catch { /* ignore */ }
        window.setTimeout(() => speakNext.current(s), 150);
        return;
      }
      if (synth.speaking) { markStarted(); return; }
      fail("no-start");
    }, 2500);

    try {
      if (synth.paused) synth.resume(); // moteur resté figé en pause (Chrome, Safari)
      synth.speak(u); // synchrone : garde le « geste utilisateur » exigé par iOS
    } catch {
      fail("unknown");
    }
  }, [fail, pause, stop]);
  useEffect(() => { speakNext.current = speakCurrent; }, [speakCurrent]);

  /** Démarre (ou reprend) la lecture ; appelé directement depuis le toucher. */
  const play = useCallback((s: Session) => {
    const synth = window.speechSynthesis;
    unlockAudioOutput();
    setError("");
    setPhase("starting");
    let busy = false;
    try { busy = synth.speaking || synth.pending; } catch { /* ignore */ }
    if (busy) {
      // speak() juste après cancel() est parfois ignoré par Safari : petit délai.
      try { synth.cancel(); } catch { /* ignore */ }
      window.setTimeout(() => speakCurrent(s), 120);
    } else speakCurrent(s);
  }, [speakCurrent]);

  function onMainClick() {
    const s = session.current;
    if (s && (phase === "speaking" || phase === "starting")) { pause(); return; }
    if (s && phase === "paused") {
      s.retried = false;
      if (currentOwner && currentOwner.session !== s) currentOwner.stop();
      currentOwner = { session: s, stop };
      play(s);
      return;
    }
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setError(speechError("unsupported"));
      return;
    }
    const chunks = speechChunks([
      title, summary,
      points.length ? (points.length === 3 ? "Trois points à retenir." : "Points à retenir.") : "",
      ...points.map((point, i) => "Point " + (i + 1) + ". " + point),
    ]);
    if (!chunks.length) { setError("Aucun texte à lire sur cette carte."); return; }
    if (currentOwner) currentOwner.stop();
    const fresh: Session = { chunks, index: 0, utterance: null, watchdog: null, retried: false };
    session.current = fresh;
    currentOwner = { session: fresh, stop };
    play(fresh);
  }

  useEffect(() => { warmVoices(); }, []);

  useEffect(() => {
    // Carte qui sort de l'écran ou composant démonté : la voix s'arrête.
    if (!active && release()) queueMicrotask(() => { setPhase("idle"); setProgress({ index: 0, total: 0 }); });
  }, [active, release]);

  useEffect(() => () => { release(); }, [release]);

  useEffect(() => {
    // Retour dans l'app : si la voix s'est arrêtée en arrière-plan, on passe en pause.
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !session.current) return;
      const synth = window.speechSynthesis;
      window.setTimeout(() => {
        const s = session.current;
        if (!s || !s.utterance) return;
        if (!synth.speaking && !synth.pending) pause();
      }, 400);
    };
    const onHide = () => { if (session.current) stop(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onHide);
    };
  }, [pause, stop]);

  const on = active && phase !== "idle";
  const playing = on && (phase === "speaking" || phase === "starting");
  const label = playing ? "Pause" : phase === "paused" && on ? "Reprendre" : error ? "Réessayer" : "Écouter";
  const status = !on ? "" : phase === "starting" ? "Démarrage de la voix"
    : (phase === "paused" ? "En pause" : "Lecture en cours") +
      (progress.total > 1 ? ", passage " + (progress.index + 1) + " sur " + progress.total : "");
  const pct = progress.total ? Math.round(((progress.index + (phase === "paused" ? 0 : 0.5)) / progress.total) * 100) : 0;
  const btn = "btn " + (tone === "light" ? "btn-secondary" : "btn-outline-light");

  return (
    <span className="inline-flex max-w-full flex-col items-start gap-1.5" data-testid="listen" data-phase={on ? phase : "idle"}>
      <span className="inline-flex items-center gap-2 max-[359px]:gap-1.5">
        <button type="button" onClick={onMainClick}
          aria-label={playing ? "Mettre en pause la lecture audio" : phase === "paused" && on ? "Reprendre la lecture audio" : "Écouter le résumé"}
          aria-pressed={playing}
          title="Lecture par la voix de votre appareil ; aucun fichier audio téléchargé"
          className={btn + " relative overflow-hidden"}>
          <span aria-hidden="true" className={"inline-block w-3 text-center" + (phase === "starting" && on ? " animate-pulse motion-reduce:animate-none" : "")}>{playing ? "❚❚" : "▶"}</span>
          <span className={on ? "max-[359px]:sr-only" : ""}>{label}</span>
          {on && (
            // Barre de progression : montre que la lecture avance, sans décaler la mise en page.
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-current/20">
              <span className="block h-full bg-current transition-[width] duration-500 motion-reduce:transition-none" style={{ width: pct + "%" }} />
            </span>
          )}
        </button>
        {on && (
          <button type="button" onClick={stop} aria-label="Arrêter la lecture audio" title="Arrêter"
            className={btn + " px-3"}>
            <span aria-hidden="true">■</span>
          </button>
        )}
      </span>
      {on && <span role="status" className="sr-only">{status}</span>}
      {error && !on && <span role="status" className={"max-w-72 text-xs leading-relaxed " + (tone === "light" ? "text-[#79571c]" : "text-[#ffd98f]")}>{error}</span>}
    </span>
  );
}
