"use client";

import { useEffect } from "react";
import { fetchTtsStatus, fetchTtsVoices } from "@/lib/api/tts";
import { DEEPGRAM_DEFAULT_VOICE, DEEPGRAM_VOICE_GROUPS } from "@/lib/tts/deepgramVoices";
import { useTtsStore } from "@/store/ttsStore";

/** Инициализация TTS при входе в приложение (не только при открытии чата). */
export function useTtsBootstrap() {
  const setServerTts = useTtsStore((s) => s.setServerTts);
  const setVoiceGroups = useTtsStore((s) => s.setVoiceGroups);
  const setVoiceGroupsFallback = useTtsStore((s) => s.setVoiceGroupsFallback);

  useEffect(() => {
    fetchTtsStatus()
      .then((s) => {
        const enabled = Boolean(s.enabled);
        setServerTts(enabled, {
          voiceSelection: true,
          defaultVoice: s.voice ?? DEEPGRAM_DEFAULT_VOICE,
        });
        if (!enabled) {
          setVoiceGroups(DEEPGRAM_VOICE_GROUPS, s.voice ?? DEEPGRAM_DEFAULT_VOICE);
          return;
        }
        return fetchTtsVoices()
          .then((data) => setVoiceGroups(data.groups, data.default_voice))
          .catch(() => {
            setVoiceGroups(DEEPGRAM_VOICE_GROUPS, s.voice ?? DEEPGRAM_DEFAULT_VOICE);
          });
      })
      .catch(() => {
        setVoiceGroups(DEEPGRAM_VOICE_GROUPS, DEEPGRAM_DEFAULT_VOICE);
        useTtsStore.setState({ serverTts: false, voiceSelection: true });
      });
  }, [setServerTts, setVoiceGroups, setVoiceGroupsFallback]);
}
