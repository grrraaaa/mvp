"use client";

import { useCallback, useEffect } from "react";
import { fetchAssistantSpeech } from "@/lib/api/tts";
import { isBrowserSpeechAvailable, speakWithBrowserSpeech } from "@/lib/tts/browserSpeech";
import { onTtsLipSync, playTtsBlob, stopTtsPlayback } from "@/lib/tts/playback";
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
  const serverTts = useTtsStore((s) => s.serverTts);
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
        const blob = await fetchAssistantSpeech(trimmed, voiceId);
        if (!isTtsEnabled()) return;
        await playTtsBlob(blob, trimmed);
      } catch {
        const edgeVoice =
          voiceId === "qwen-female" ||
          voiceId?.includes("Svetlana") ||
          voiceId?.includes("Wavenet-A")
            ? "ru-RU-SvetlanaNeural"
            : "ru-RU-DmitryNeural";
        try {
          const blob = await fetchAssistantSpeech(trimmed, edgeVoice);
          if (!isTtsEnabled()) return;
          await playTtsBlob(blob, trimmed);
          return;
        } catch {
          /* try browser */
        }
        if (!isTtsEnabled() || !isBrowserSpeechAvailable()) return;
        try {
          await speakWithBrowserSpeech(trimmed, voiceId);
        } catch {
          /* server + browser TTS unavailable */
        }
      }
    },
    [voiceId, setEmotion, startTalk],
  );

  const toggleWithStop = useCallback(() => {
    const next = !useTtsStore.getState().enabled;
    setEnabled(next);
  }, [setEnabled]);

  return { enabled, speak, stop, toggleEnabled: toggleWithStop, serverTts, setEnabled };
}
