"use client";

import { useEffect } from "react";
import {
  ASSISTANT_DEFAULT_VOICE,
  assistantVoiceGroups,
} from "@/lib/tts/assistantVoices";
import {
  COMBINED_DEFAULT_VOICE,
  COMBINED_VOICE_GROUPS,
  combinedFallback,
} from "@/lib/tts/combinedVoices";
import { fetchTtsStatus, fetchTtsVoices } from "@/lib/api/tts";
import { useTtsStore } from "@/store/ttsStore";
import { pickVoiceForCharacter } from "@/lib/tts/matchVoiceForCharacter";
import { useCharacterStore } from "@/store/characterStore";
import type { TtsVoiceGroup } from "@/store/ttsStore";

export function syncVoiceToCurrentCharacter() {
  if (typeof window === "undefined") return;
  const char = useCharacterStore.getState();
  const charStyleId = char.config.styleId;
  if (charStyleId !== "human-m" && charStyleId !== "human-f") return;
  const tts = useTtsStore.getState();
  const wanted = pickVoiceForCharacter(tts.voiceGroups, charStyleId);
  if (wanted && tts.voiceId !== wanted) {
    tts.setVoiceId(wanted);
  }
}

function mergeVoiceGroups(apiGroups: TtsVoiceGroup[]): TtsVoiceGroup[] {
  const groups = assistantVoiceGroups(apiGroups);
  return groups.length ? groups : COMBINED_VOICE_GROUPS;
}

/** Загрузка каталога голосов (мужской / женский, без выбора языка). */
export function useTtsBootstrap() {
  const setServerTts = useTtsStore((s) => s.setServerTts);
  const setVoiceGroups = useTtsStore((s) => s.setVoiceGroups);

  useEffect(() => {
    const staticFallback = combinedFallback(COMBINED_DEFAULT_VOICE);

    fetchTtsStatus()
      .then((status) => {
        setServerTts(Boolean(status.enabled), {
          defaultVoice: status.voice ?? staticFallback.defaultVoice,
          voiceSelection: false,
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
        setServerTts(true, { defaultVoice: COMBINED_DEFAULT_VOICE });
        setVoiceGroups(COMBINED_VOICE_GROUPS, COMBINED_DEFAULT_VOICE);
        syncVoiceToCurrentCharacter();
      });
  }, [setServerTts, setVoiceGroups]);
}
