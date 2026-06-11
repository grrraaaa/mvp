"use client";

import { useEffect } from "react";
import {
  COMBINED_DEFAULT_VOICE,
  COMBINED_VOICE_GROUPS,
} from "@/lib/tts/combinedVoices";
import { loadPuterScript } from "@/lib/tts/puterTts";
import { useTtsStore } from "@/store/ttsStore";
import { pickVoiceForCharacter } from "@/lib/tts/matchVoiceForCharacter";
import { useCharacterStore } from "@/store/characterStore";

function syncVoiceToCurrentCharacter() {
  if (typeof window === "undefined") return;
  const char = useCharacterStore.getState();
  if (char.voiceOverride) return;
  const charStyleId = char.config.styleId;
  if (charStyleId !== "human-m" && charStyleId !== "human-f") return;
  const tts = useTtsStore.getState();
  const wanted = pickVoiceForCharacter(tts.voiceGroups, charStyleId);
  if (wanted && tts.voiceId !== wanted) {
    tts.setVoiceId(wanted);
  }
}

/** Инициализация Puter TTS при входе в приложение. */
export function useTtsBootstrap() {
  const setServerTts = useTtsStore((s) => s.setServerTts);
  const setVoiceGroups = useTtsStore((s) => s.setVoiceGroups);

  useEffect(() => {
    setServerTts(true, { defaultVoice: COMBINED_DEFAULT_VOICE });
    setVoiceGroups(COMBINED_VOICE_GROUPS, COMBINED_DEFAULT_VOICE);
    syncVoiceToCurrentCharacter();
    void loadPuterScript().catch(() => {
      /* Puter подгрузится при первой озвучке */
    });
  }, [setServerTts, setVoiceGroups]);
}
