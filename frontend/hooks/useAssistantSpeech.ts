"use client";

import { useCallback, useEffect } from "react";
import { fetchAssistantSpeech } from "@/lib/api/tts";
import { isBrowserSpeechAvailable, speakWithBrowserSpeech } from "@/lib/tts/browserSpeech";
import { playTtsBlob, stopTtsPlayback } from "@/lib/tts/playback";
import { useTtsStore } from "@/store/ttsStore";

function isTtsEnabled(): boolean {
  return useTtsStore.getState().enabled;
}

export function useAssistantSpeech() {
  const enabled = useTtsStore((s) => s.enabled);
  const serverTts = useTtsStore((s) => s.serverTts);
  const voiceId = useTtsStore((s) => s.voiceId);
  const setEnabled = useTtsStore((s) => s.setEnabled);

  useEffect(() => {
    if (!enabled) stopTtsPlayback();
  }, [enabled]);

  const stop = useCallback(() => {
    stopTtsPlayback();
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!isTtsEnabled() || !trimmed) return;

      stopTtsPlayback();

      try {
        const blob = await fetchAssistantSpeech(trimmed, voiceId);
        if (!isTtsEnabled()) return;
        await playTtsBlob(blob);
      } catch {
        const edgeVoice =
          voiceId === "qwen-female" ||
          voiceId?.includes("Svetlana") ||
          voiceId?.includes("Wavenet-A")
            ? "ru-RU-SvetlanaNeural"
            : "ru-RU-DmitryNeural";
        try {
          const blob = await fetchAssistantSpeech(trimmed, edgeVoice);
          if (!isTtsEnabled()) return;
          await playTtsBlob(blob);
          return;
        } catch {
          /* try browser */
        }
        if (!isTtsEnabled() || !isBrowserSpeechAvailable()) return;
        try {
          await speakWithBrowserSpeech(trimmed, voiceId);
        } catch {
          /* server + browser TTS unavailable */
        }
      }
    },
    [voiceId],
  );

  const toggleWithStop = useCallback(() => {
    const next = !useTtsStore.getState().enabled;
    setEnabled(next);
  }, [setEnabled]);

  return { enabled, speak, stop, toggleEnabled: toggleWithStop, serverTts, setEnabled };
}
