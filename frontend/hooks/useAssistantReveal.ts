"use client";

import { useCallback, useEffect, useRef } from "react";
import { charDelayForSpeech, revealTextGradually } from "@/lib/assistant/revealText";
import { playPreparedSpeech } from "@/lib/tts/voiceProvider";
import { prefetchSpeechWithTimeout } from "@/lib/tts/prefetchSpeech";
import { cleanTextForTts } from "@/lib/tts/cleanTextForTts";
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
    updateLastAssistant({
      awaitingVoice: false,
      revealing: false,
      streaming: false,
    });
  }, [updateLastAssistant]);

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
      const speechText = cleanTextForTts(text);

      updateLastAssistant({
        ...meta,
        content: "",
        streaming: false,
        awaitingVoice: false,
        revealing: false,
      });

      const finish = (patch: Partial<ChatMessage>) => {
        if (abortRef.current !== ac) return;
        updateLastAssistant({
          content: fullText,
          awaitingVoice: false,
          revealing: false,
          streaming: false,
          ...patch,
        });
      };

      try {
        const ttsState = useTtsStore.getState();
        const voiceId = ttsState.voiceId || ttsState.defaultVoice;
        const shouldPrefetch =
          ttsState.enabled &&
          ttsState.serverTts &&
          Boolean(speechText) &&
          Boolean(voiceId);

        let speechBlob: Blob | null = null;

        if (shouldPrefetch) {
          updateLastAssistant({ awaitingVoice: true });
          const result = await prefetchSpeechWithTimeout(speechText, voiceId!, {
            signal: ac.signal,
          });
          if (ac.signal.aborted) {
            finish({});
            return;
          }
          speechBlob = result.blob;
          if (result.timedOut) {
            console.warn("[TTS] prefetch timeout (10s)");
          } else if (result.error && result.error !== "aborted") {
            console.warn("[TTS] prefetch failed:", result.error);
          }
        }

        if (ac.signal.aborted) {
          finish({});
          return;
        }

        updateLastAssistant({ awaitingVoice: false, revealing: true });

        const emotion = speech?.emotion ?? toneToEmotion(speech?.tone);
        const { setEmotion, startTalk } = useCharacterBehaviorStore.getState();
        setEmotion(emotion);

        const durationMs = Math.min(12000, Math.max(3200, text.length * 62));
        const charDelayMs = charDelayForSpeech(text, durationMs);

        const playPromise =
          speechBlob && ttsState.enabled
            ? (async () => {
                startTalk(text.slice(0, 160), durationMs);
                useCharacterBehaviorStore.setState({
                  lipTimeline: buildLipTimeline(text.slice(0, 160), durationMs),
                  talkStartedAt: performance.now(),
                });
                try {
                  await playPreparedSpeech(speechBlob, speechText);
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
          finish({});
        }

        void playPromise;
      } catch (err) {
        console.warn("[AssistantReveal] failed:", err);
        if (!ac.signal.aborted) {
          finish({});
        }
      } finally {
        if (abortRef.current === ac) {
          abortRef.current = null;
        }
      }
    },
    [updateLastAssistant],
  );

  return { revealLastAssistant, cancelReveal };
}
