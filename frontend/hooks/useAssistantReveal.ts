"use client";

import { useCallback, useEffect, useRef } from "react";
import { charDelayForSpeech, revealTextGradually } from "@/lib/assistant/revealText";
import { prefetchSpeech, playPreparedSpeech } from "@/lib/tts/voiceProvider";
import { useAssistantStore, type ChatMessage } from "@/store/assistantStore";
import { useCharacterBehaviorStore } from "@/store/characterBehaviorStore";
import { buildLipTimeline } from "@/lib/assistant/lipSync";
import { useTtsStore } from "@/store/ttsStore";

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

export function useAssistantReveal() {
  const updateLastAssistant = useAssistantStore((s) => s.updateLastAssistant);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const cancelReveal = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const revealLastAssistant = useCallback(
    async (
      fullText: string,
      meta: Partial<ChatMessage> = {},
      speech?: { tone?: string; emotion?: string },
    ) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const text = fullText.trim();
      updateLastAssistant({
        ...meta,
        content: "",
        streaming: false,
        awaitingVoice: true,
        revealing: false,
      });

      const ttsEnabled = useTtsStore.getState().enabled;
      const voiceId = useTtsStore.getState().voiceId || useTtsStore.getState().defaultVoice;
      let speechBlob: Blob | null = null;

      if (ttsEnabled && text && voiceId) {
        try {
          speechBlob = await prefetchSpeech(text, voiceId);
        } catch {
          speechBlob = null;
        }
        if (ac.signal.aborted) return;
      }

      updateLastAssistant({ awaitingVoice: false, revealing: true });

      const emotion = speech?.emotion ?? toneToEmotion(speech?.tone);
      const { setEmotion, startTalk } = useCharacterBehaviorStore.getState();
      setEmotion(emotion);

      const durationMs = Math.min(12000, Math.max(3200, text.length * 62));
      const charDelayMs = charDelayForSpeech(text, durationMs);

      const playPromise =
        speechBlob && ttsEnabled
          ? (async () => {
              startTalk(text.slice(0, 160), durationMs);
              useCharacterBehaviorStore.setState({
                lipTimeline: buildLipTimeline(text.slice(0, 160), durationMs),
                talkStartedAt: performance.now(),
              });
              try {
                await playPreparedSpeech(speechBlob, text);
              } catch {
                /* озвучка не критична — текст всё равно печатаем */
              }
            })()
          : Promise.resolve();

      try {
        await revealTextGradually(
          fullText,
          (visible) => {
            if (!ac.signal.aborted) {
              updateLastAssistant({ content: visible, revealing: true });
            }
          },
          { charDelayMs, signal: ac.signal },
        );
      } catch {
        /* aborted */
      }

      if (!ac.signal.aborted) {
        updateLastAssistant({ content: fullText, revealing: false, awaitingVoice: false });
      }

      void playPromise;
      if (abortRef.current === ac) {
        abortRef.current = null;
      }
    },
    [updateLastAssistant],
  );

  return { revealLastAssistant, cancelReveal };
}
