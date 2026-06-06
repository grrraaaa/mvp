import type { TtsVoiceGroup } from "@/store/ttsStore";
import { DEEPGRAM_DEFAULT_VOICE, DEEPGRAM_VOICE_GROUPS } from "@/lib/tts/deepgramVoices";
import { GOOGLE_DEFAULT_VOICE, GOOGLE_VOICE_GROUPS } from "@/lib/tts/googleVoices";

export const COMBINED_DEFAULT_VOICE = GOOGLE_DEFAULT_VOICE;

export const COMBINED_VOICE_GROUPS: TtsVoiceGroup[] = [
  ...GOOGLE_VOICE_GROUPS,
  ...DEEPGRAM_VOICE_GROUPS,
];

export function combinedFallback(defaultVoice?: string | null) {
  return {
    groups: COMBINED_VOICE_GROUPS,
    defaultVoice: defaultVoice ?? COMBINED_DEFAULT_VOICE,
  };
}

export function fallbackForProvider(provider: string | null | undefined, defaultVoice?: string | null) {
  if (provider === "multi") {
    return combinedFallback(defaultVoice);
  }
  if (provider === "google") {
    return {
      groups: GOOGLE_VOICE_GROUPS,
      defaultVoice: defaultVoice ?? GOOGLE_DEFAULT_VOICE,
    };
  }
  if (provider === "deepgram") {
    return {
      groups: DEEPGRAM_VOICE_GROUPS,
      defaultVoice: defaultVoice ?? DEEPGRAM_DEFAULT_VOICE,
    };
  }
  return combinedFallback(defaultVoice);
}
