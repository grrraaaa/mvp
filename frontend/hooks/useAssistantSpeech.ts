"use client";

import { useCallback, useEffect } from "react";
import { fetchAssistantSpeech, fetchTtsStatus, fetchTtsVoices } from "@/lib/api/tts";
import { playTtsBlob, stopTtsPlayback } from "@/lib/tts/playback";
import { useTtsStore } from "@/store/ttsStore";

function isTtsEnabled(): boolean {
  return useTtsStore.getState().enabled;
}

export function useAssistantSpeech() {
  const enabled = useTtsStore((s) => s.enabled);
  const serverTts = useTtsStore((s) => s.serverTts);
  const voiceId = useTtsStore((s) => s.voiceId);
  const setServerTts = useTtsStore((s) => s.setServerTts);
  const setVoiceGroups = useTtsStore((s) => s.setVoiceGroups);
  const setVoiceGroupsFallback = useTtsStore((s) => s.setVoiceGroupsFallback);
  const setEnabled = useTtsStore((s) => s.setEnabled);

  useEffect(() => {
    fetchTtsStatus()
      .then((s) => {
        setServerTts(s.enabled, {
          voiceSelection: Boolean(s.voice_selection),
          defaultVoice: s.voice ?? undefined,
        });
        if (!s.voice_selection) return;
        return fetchTtsVoices()
          .then((data) => setVoiceGroups(data.groups, data.default_voice))
          .catch(() => {
            const fallback = s.voice ?? useTtsStore.getState().defaultVoice;
            if (fallback) setVoiceGroupsFallback(fallback);
          });
      })
      .catch(() => {
        useTtsStore.setState({ serverTts: false });
      });
  }, [setServerTts, setVoiceGroups, setVoiceGroupsFallback]);

  useEffect(() => {
    if (!enabled) stopTtsPlayback();
  }, [enabled]);

  const stop = useCallback(() => {
    stopTtsPlayback();
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!isTtsEnabled() || !trimmed || !useTtsStore.getState().serverTts) return;

      stopTtsPlayback();

      try {
        const blob = await fetchAssistantSpeech(trimmed, voiceId);
        if (!isTtsEnabled()) return;
        await playTtsBlob(blob);
      } catch {
        /* Deepgram недоступен — без озвучки */
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
