"use client";

import { useCallback, useEffect } from "react";
import { onTtsLipSync, playTtsElement, stopTtsPlayback } from "@/lib/tts/playback";
import { puterTextToSpeech } from "@/lib/tts/puterTts";
import { PUTER_DEFAULT_LANGUAGE } from "@/lib/tts/puterVoices";
import { useCharacterBehaviorStore } from "@/store/characterBehaviorStore";
import { buildLipTimeline } from "@/lib/assistant/lipSync";
import { useTtsStore } from "@/store/ttsStore";

function isTtsEnabled(): boolean {
  return useTtsStore.getState().enabled;
}

function toneToEmotion(tone?: string): string {
  return (
    {
      success: "smile",
      warning: "concern",
      error: "apologetic",
      info: "explain",
      neutral: "idle",
    }[tone ?? ""] ?? "idle"
  );
}

export function useAssistantSpeech() {
  const enabled = useTtsStore((s) => s.enabled);
  const voiceId = useTtsStore((s) => s.voiceId);
  const setEnabled = useTtsStore((s) => s.setEnabled);
  const { startTalk, finishTalk, setEmotion } = useCharacterBehaviorStore();

  useEffect(() => {
    if (!enabled) stopTtsPlayback();
  }, [enabled]);

  useEffect(() => {
    return onTtsLipSync((openness, speaking) => {
      if (!speaking) return;
      const store = useCharacterBehaviorStore.getState();
      if (store.action !== "talk") {
        store.startTalk("", 3000);
      }
      useCharacterBehaviorStore.setState({
        lipOpenOverride: openness,
        action: "talk",
      });
    });
  }, []);

  const stop = useCallback(() => {
    stopTtsPlayback();
    finishTalk();
  }, [finishTalk]);

  const speak = useCallback(
    async (text: string, options?: { tone?: string; emotion?: string }) => {
      const trimmed = text.trim();
      if (!isTtsEnabled() || !trimmed) return;

      const emotion = options?.emotion ?? toneToEmotion(options?.tone);
      setEmotion(emotion);
      const durationMs = Math.min(12000, Math.max(3200, trimmed.length * 62));
      startTalk(trimmed.slice(0, 160), durationMs);
      useCharacterBehaviorStore.setState({
        lipTimeline: buildLipTimeline(trimmed.slice(0, 160), durationMs),
        talkStartedAt: performance.now(),
      });

      stopTtsPlayback();

      try {
        const language = voiceId || PUTER_DEFAULT_LANGUAGE;
        const audio = await puterTextToSpeech(trimmed, language);
        if (!isTtsEnabled()) return;
        await playTtsElement(audio, trimmed);
      } catch (err) {
        console.warn("[TTS] Puter playback failed:", err);
      }
    },
    [voiceId, setEmotion, startTalk],
  );

  const toggleWithStop = useCallback(() => {
    const next = !useTtsStore.getState().enabled;
    setEnabled(next);
  }, [setEnabled]);

  return { enabled, speak, stop, toggleEnabled: toggleWithStop, serverTts: true, setEnabled };
}
