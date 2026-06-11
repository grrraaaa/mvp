import type { TtsVoiceGroup } from "@/store/ttsStore";
import { EDGE_DEFAULT_VOICE, EDGE_VOICE_GROUPS } from "@/lib/tts/edgeVoices";
import { GOOGLE_DEFAULT_VOICE, GOOGLE_VOICE_GROUPS } from "@/lib/tts/googleVoices";
import { QWEN_DEFAULT_VOICE, QWEN_VOICE_GROUPS } from "@/lib/tts/qwenVoices";

/** Дефолтный голос: Google male (Wavenet-B). Если Google не сконфигурён
 *  на бэке, бэк сам отдаст Edge / Qwen — фронт просто рисует каталог. */
export const COMBINED_DEFAULT_VOICE = GOOGLE_DEFAULT_VOICE;

export const COMBINED_VOICE_GROUPS: TtsVoiceGroup[] = [
  ...GOOGLE_VOICE_GROUPS,
  ...QWEN_VOICE_GROUPS,
  ...EDGE_VOICE_GROUPS,
];

export function combinedFallback(defaultVoice?: string | null) {
  return {
    groups: COMBINED_VOICE_GROUPS,
    defaultVoice: defaultVoice ?? COMBINED_DEFAULT_VOICE,
  };
}

export function fallbackForProvider(provider: string | null | undefined, defaultVoice?: string | null) {
  if (provider === "edge") {
    return {
      groups: EDGE_VOICE_GROUPS,
      defaultVoice: defaultVoice ?? EDGE_DEFAULT_VOICE,
    };
  }
  if (provider === "qwen") {
    return {
      groups: QWEN_VOICE_GROUPS,
      defaultVoice: defaultVoice ?? QWEN_DEFAULT_VOICE,
    };
  }
  if (provider === "google") {
    return {
      groups: GOOGLE_VOICE_GROUPS,
      defaultVoice: defaultVoice ?? GOOGLE_DEFAULT_VOICE,
    };
  }
  return combinedFallback(defaultVoice);
}
