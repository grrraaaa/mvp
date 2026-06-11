"use client";

import { useEffect } from "react";
import {
  ASSISTANT_DEFAULT_VOICE,
  allAssistantVoices,
  assistantVoiceGroups,
} from "@/lib/tts/assistantVoices";
import {
  COMBINED_DEFAULT_VOICE,
  COMBINED_VOICE_GROUPS,
  combinedFallback,
} from "@/lib/tts/combinedVoices";
import { fetchTtsStatus, fetchTtsVoices } from "@/lib/api/tts";
import { useTtsStore } from "@/store/ttsStore";
import { pickVoiceForCharacter, styleIdToGender } from "@/lib/tts/matchVoiceForCharacter";
import { useCharacterStore } from "@/store/characterStore";
import type { TtsVoiceGroup } from "@/store/ttsStore";

export function syncVoiceToCurrentCharacter() {
  if (typeof window === "undefined") return;
  const char = useCharacterStore.getState();
  const charStyleId = char.config.styleId;
  if (charStyleId !== "human-m" && charStyleId !== "human-f") return;

  const tts = useTtsStore.getState();
  const voices = allAssistantVoices(tts.voiceGroups);

  if (char.voiceOverride) {
    const manual = voices.find((v) => v.id === char.voiceOverride);
    if (manual && tts.voiceId !== char.voiceOverride) {
      tts.setVoiceId(char.voiceOverride);
    }
    return;
  }

  const gender = styleIdToGender(charStyleId);
  const current = voices.find((v) => v.id === tts.voiceId);
  if (current?.gender === gender) return;

  const wanted = pickVoiceForCharacter(tts.voiceGroups, charStyleId, tts.voiceId);
  if (wanted && tts.voiceId !== wanted) {
    tts.setVoiceId(wanted);
  }
}

function mergeVoiceGroups(apiGroups: TtsVoiceGroup[]): TtsVoiceGroup[] {
  const groups = assistantVoiceGroups(apiGroups);
  return groups.length ? groups : COMBINED_VOICE_GROUPS;
}

/** Загрузка каталога голосов (2 мужских + 2 женских). */
export function useTtsBootstrap() {
  const setServerTts = useTtsStore((s) => s.setServerTts);
  const setVoiceGroups = useTtsStore((s) => s.setVoiceGroups);

  useEffect(() => {
    const staticFallback = combinedFallback(COMBINED_DEFAULT_VOICE);

    fetchTtsStatus()
      .then((status) => {
        setServerTts(Boolean(status.enabled), {
          defaultVoice: status.voice ?? staticFallback.defaultVoice,
          voiceSelection: true,
        });
        return fetchTtsVoices();
      })
      .then((data) => {
        const groups = mergeVoiceGroups(data.groups as TtsVoiceGroup[]);
        const defaultVoice = data.default_voice || ASSISTANT_DEFAULT_VOICE;
        setVoiceGroups(groups, defaultVoice);
        syncVoiceToCurrentCharacter();
      })
      .catch(() => {
        // Сервер озвучки недоступен — не блокируем чат ожиданием TTS.
        setServerTts(false, { defaultVoice: COMBINED_DEFAULT_VOICE, voiceSelection: true });
        setVoiceGroups(COMBINED_VOICE_GROUPS, COMBINED_DEFAULT_VOICE);
        syncVoiceToCurrentCharacter();
      });
  }, [setServerTts, setVoiceGroups]);
}
