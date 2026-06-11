import {
  ASSISTANT_DEFAULT_VOICE,
  ASSISTANT_VOICE_GROUPS,
} from "@/lib/tts/assistantVoices";

export const COMBINED_DEFAULT_VOICE = ASSISTANT_DEFAULT_VOICE;
export const COMBINED_VOICE_GROUPS = ASSISTANT_VOICE_GROUPS;

export function combinedFallback(defaultVoice?: string | null) {
  return {
    groups: ASSISTANT_VOICE_GROUPS,
    defaultVoice: defaultVoice ?? COMBINED_DEFAULT_VOICE,
  };
}

export function fallbackForProvider(_provider: string | null | undefined, defaultVoice?: string | null) {
  return combinedFallback(defaultVoice);
}
