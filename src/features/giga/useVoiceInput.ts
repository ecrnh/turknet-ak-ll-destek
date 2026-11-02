import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** Spoken when the browser has no microphone access (prototype simulation). */
export const VOICE_SAMPLE = "İnternetim kesildi";

interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => Recognition;

/**
 * Voice input for GIGA. Uses the browser's Turkish speech recognition when it
 * is available and allowed; otherwise simulates a short listening moment with
 * a sample sentence and says so (no audio leaves the prototype).
 */
export function useVoiceInput(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const sim = useRef<number | null>(null);
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(
    () => () => {
      if (sim.current) window.clearTimeout(sim.current);
      rec.current?.stop();
    },
    [],
  );

  const simulate = () => {
    setListening(true);
    sim.current = window.setTimeout(() => {
      sim.current = null;
      setListening(false);
      toast("Sesli giriş simülasyonu", { description: `Mikrofon kullanılamadı; örnek cümle: “${VOICE_SAMPLE}”` });
      cb.current(VOICE_SAMPLE);
    }, 1800);
  };

  const stop = () => {
    if (sim.current) {
      window.clearTimeout(sim.current);
      sim.current = null;
    }
    rec.current?.stop();
    rec.current = null;
    setListening(false);
  };

  const toggle = () => {
    if (listening) return stop();
    const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return simulate();
    try {
      const r = new SR();
      r.lang = "tr-TR";
      r.interimResults = false;
      r.maxAlternatives = 1;
      let heard = false;
      r.onresult = (e) => {
        const t = e.results[0]?.[0]?.transcript?.trim();
        if (t) {
          heard = true;
          cb.current(t);
        }
      };
      r.onerror = (e) => {
        rec.current = null;
        if (!heard && e.error !== "aborted" && e.error !== "no-speech") simulate();
        else setListening(false);
      };
      r.onend = () => {
        if (rec.current === r) rec.current = null;
        if (!sim.current) setListening(false);
      };
      rec.current = r;
      setListening(true);
      r.start();
    } catch {
      simulate();
    }
  };

  return { listening, toggle };
}
