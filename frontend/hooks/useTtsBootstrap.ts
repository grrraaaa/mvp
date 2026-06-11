"use client";

import { useEffect } from "react";
import { fetchTtsStatus, fetchTtsVoices } from "@/lib/api/tts";
import {
  COMBINED_DEFAULT_VOICE,
  COMBINED_VOICE_GROUPS,
  combinedFallback,
} from "@/lib/tts/combinedVoices";
import { useTtsStore } from "@/store/ttsStore";
import { pickVoiceForCharacter } from "@/lib/tts/matchVoiceForCharacter";
import { useCharacterStore } from "@/store/characterStore";

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

/** Синхронизирует текущий voiceId с полом активного персонажа. Вызывается
 *  после каждой загрузки списка голосов — иначе при гонке «пресет применился
 *  раньше, чем пришли голоса» в ttsStore залёг старый voiceId (например,
 *  qwen-female от прошлой женской роли), и Александр озвучивается женским. */
function syncVoiceToCurrentCharacter() {
  if (typeof window === "undefined") return;
  const charStyleId = useCharacterStore.getState().config.styleId;
  if (charStyleId !== "human-m" && charStyleId !== "human-f") return;
  const tts = useTtsStore.getState();
  const wanted = pickVoiceForCharacter(tts.voiceGroups, charStyleId);
  if (wanted && tts.voiceId !== wanted) {
    tts.setVoiceId(wanted);
  }
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
        // Голос выбирается автоматически по полу модели (см. characterStore.applyPreset),
        // ручной UI-выбор озвучки отключён, поэтому voiceSelection не передаём.
        setServerTts(enabled, {
          defaultVoice: s.voice ?? staticFallback.defaultVoice,
        });
        return fetchTtsVoices()
          .then((data) => {
            const groups = mergeVoiceGroups(data.groups);
            setVoiceGroups(groups, data.default_voice || staticFallback.defaultVoice);
            // После загрузки списка — пересинхронизировать voiceId с активным персонажем.
            // Покрывает случай, когда applyPreset отработал раньше и оставил в localStorage
            // voiceId от прошлой роли (например qwen-female), а сейчас активен Александр.
            syncVoiceToCurrentCharacter();
          })
          .catch(() => {
            setVoiceGroups(staticFallback.groups, staticFallback.defaultVoice);
            syncVoiceToCurrentCharacter();
          });
      })
      .catch(() => {
        setVoiceGroups(COMBINED_VOICE_GROUPS, COMBINED_DEFAULT_VOICE);
        useTtsStore.setState({ serverTts: true });
        syncVoiceToCurrentCharacter();
      });
  }, [setServerTts, setVoiceGroups]);
}
