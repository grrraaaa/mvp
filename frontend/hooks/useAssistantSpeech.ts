"use client";

import { useCallback, useEffect } from "react";
import { fetchAssistantSpeech } from "@/lib/api/tts";
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
        useTtsStore.setState({ serverTts: true });
        await playTtsBlob(blob);
      } catch {
        useTtsStore.setState({ serverTts: false });
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
