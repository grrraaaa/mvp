"use client";

import { useCallback, useEffect, useRef } from "react";
import { fetchAssistantSpeech, fetchTtsStatus } from "@/lib/api/tts";
import { useTtsStore } from "@/store/ttsStore";

function isMostlyCyrillic(text: string): boolean {
  const cyr = (text.match(/[\u0400-\u04FF]/g) ?? []).length;
  const lat = (text.match(/[a-zA-Z]/g) ?? []).length;
  return cyr > lat;
}

function speakWithBrowser(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ru-RU";
  utterance.rate = 1.02;
  const voices = window.speechSynthesis.getVoices();
  const ru =
    voices.find((v) => v.lang.startsWith("ru")) ??
    voices.find((v) => v.lang.includes("ru"));
  if (ru) utterance.voice = ru;
  window.speechSynthesis.speak(utterance);
}

export function useAssistantSpeech() {
  const enabled = useTtsStore((s) => s.enabled);
  const serverTts = useTtsStore((s) => s.serverTts);
  const voiceId = useTtsStore((s) => s.voiceId);
  const toggleEnabled = useTtsStore((s) => s.toggleEnabled);
  const setServerTts = useTtsStore((s) => s.setServerTts);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    fetchTtsStatus()
      .then((s) =>
        setServerTts(s.enabled, {
          voiceSelection: Boolean(s.voice_selection),
          defaultVoice: s.voice ?? undefined,
        }),
      )
      .catch(() => setServerTts(false));
  }, [setServerTts]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!enabled || !trimmed) return;

      stop();

      if (serverTts) {
        try {
          const blob = await fetchAssistantSpeech(trimmed, voiceId);
          const url = URL.createObjectURL(blob);
          objectUrlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => {
            if (objectUrlRef.current === url) {
              URL.revokeObjectURL(url);
              objectUrlRef.current = null;
            }
            audioRef.current = null;
          };
          await audio.play();
          return;
        } catch {
          /* fallback */
        }
      }

      if (isMostlyCyrillic(trimmed) || !serverTts) {
        speakWithBrowser(trimmed);
      }
    },
    [enabled, serverTts, voiceId, stop],
  );

  const setEnabled = useTtsStore((s) => s.setEnabled);
  const toggleWithStop = useCallback(() => {
    const next = !useTtsStore.getState().enabled;
    if (!next) stop();
    useTtsStore.getState().setEnabled(next);
  }, [stop]);

  return { enabled, speak, stop, toggleEnabled: toggleWithStop, serverTts, setEnabled };
}
