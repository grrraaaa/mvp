"use client";

import { useEffect } from "react";
import { fetchTtsStatus, fetchTtsVoices } from "@/lib/api/tts";
import {
  COMBINED_DEFAULT_VOICE,
  COMBINED_VOICE_GROUPS,
  fallbackForProvider,
} from "@/lib/tts/combinedVoices";
import { useTtsStore } from "@/store/ttsStore";

/** Инициализация TTS при входе в приложение (не только при открытии чата). */
export function useTtsBootstrap() {
  const setServerTts = useTtsStore((s) => s.setServerTts);
  const setVoiceGroups = useTtsStore((s) => s.setVoiceGroups);

  useEffect(() => {
    fetchTtsStatus()
      .then((s) => {
        const enabled = Boolean(s.enabled);
        const fallback = fallbackForProvider(s.provider, s.voice);
        setServerTts(enabled, {
          voiceSelection: true,
          defaultVoice: fallback.defaultVoice,
        });
        if (!enabled) {
          setVoiceGroups(fallback.groups, fallback.defaultVoice);
          return;
        }
        return fetchTtsVoices()
          .then((data) => setVoiceGroups(data.groups, data.default_voice))
          .catch(() => {
            setVoiceGroups(fallback.groups, fallback.defaultVoice);
          });
      })
      .catch(() => {
        setVoiceGroups(COMBINED_VOICE_GROUPS, COMBINED_DEFAULT_VOICE);
        useTtsStore.setState({ serverTts: false, voiceSelection: true });
      });
  }, [setServerTts, setVoiceGroups]);
}
