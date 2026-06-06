"use client";

import { useEffect } from "react";
import { fetchTtsStatus, fetchTtsVoices } from "@/lib/api/tts";
import {
  COMBINED_DEFAULT_VOICE,
  COMBINED_VOICE_GROUPS,
  combinedFallback,
} from "@/lib/tts/combinedVoices";
import { useTtsStore } from "@/store/ttsStore";

function mergeVoiceGroups(apiGroups: typeof COMBINED_VOICE_GROUPS) {
  const byId = new Map(COMBINED_VOICE_GROUPS.map((g) => [g.id, { ...g, voices: [...g.voices] }]));
  for (const group of apiGroups) {
    const existing = byId.get(group.id);
    if (existing) {
      existing.voices = group.voices.length ? group.voices : existing.voices;
      existing.label = group.label || existing.label;
    } else {
      byId.set(group.id, group);
    }
  }
  return Array.from(byId.values());
}

/** Инициализация TTS при входе в приложение (не только при открытии чата). */
export function useTtsBootstrap() {
  const setServerTts = useTtsStore((s) => s.setServerTts);
  const setVoiceGroups = useTtsStore((s) => s.setVoiceGroups);

  useEffect(() => {
    const staticFallback = combinedFallback(COMBINED_DEFAULT_VOICE);

    fetchTtsStatus()
      .then((s) => {
        const enabled = Boolean(s.enabled);
        setServerTts(enabled, {
          voiceSelection: true,
          defaultVoice: s.voice ?? staticFallback.defaultVoice,
        });
        return fetchTtsVoices()
          .then((data) => {
            const groups = mergeVoiceGroups(data.groups);
            setVoiceGroups(groups, data.default_voice || staticFallback.defaultVoice);
          })
          .catch(() => {
            setVoiceGroups(staticFallback.groups, staticFallback.defaultVoice);
          });
      })
      .catch(() => {
        setVoiceGroups(COMBINED_VOICE_GROUPS, COMBINED_DEFAULT_VOICE);
        useTtsStore.setState({ serverTts: true, voiceSelection: true });
      });
  }, [setServerTts, setVoiceGroups]);
}
