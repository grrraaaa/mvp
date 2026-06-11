import type { TtsVoiceGroup } from "@/store/ttsStore";
import {
  PUTER_DEFAULT_LANGUAGE,
  PUTER_VOICE_GROUPS,
} from "@/lib/tts/puterVoices";

export const COMBINED_DEFAULT_VOICE = PUTER_DEFAULT_LANGUAGE;
export const COMBINED_VOICE_GROUPS: TtsVoiceGroup[] = PUTER_VOICE_GROUPS;

export function combinedFallback(defaultVoice?: string | null) {
  return {
    groups: PUTER_VOICE_GROUPS,
    defaultVoice: defaultVoice ?? COMBINED_DEFAULT_VOICE,
  };
}

export function fallbackForProvider(_provider: string | null | undefined, defaultVoice?: string | null) {
  return combinedFallback(defaultVoice);
}
