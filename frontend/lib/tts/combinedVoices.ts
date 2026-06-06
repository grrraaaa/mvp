import type { TtsVoiceGroup } from "@/store/ttsStore";
import { EDGE_DEFAULT_VOICE, EDGE_VOICE_GROUPS } from "@/lib/tts/edgeVoices";
import { QWEN_DEFAULT_VOICE, QWEN_VOICE_GROUPS } from "@/lib/tts/qwenVoices";

export const COMBINED_DEFAULT_VOICE = EDGE_DEFAULT_VOICE;

export const COMBINED_VOICE_GROUPS: TtsVoiceGroup[] = [
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
  return combinedFallback(defaultVoice);
}
