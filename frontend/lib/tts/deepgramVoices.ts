import type { TtsVoiceGroup } from "@/store/ttsStore";

/** Синхрон с backend/services/tts/deepgram_voices.py */
export const DEEPGRAM_DEFAULT_VOICE = "arcas";

export const DEEPGRAM_VOICE_GROUPS: TtsVoiceGroup[] = [
  {
    id: "deepgram",
    label: "Deepgram",
    voices: [
      { id: "arcas", name: "Мужской", gender: "male", locale: "ru" },
      { id: "orpheus", name: "Мужской (уверенный)", gender: "male", locale: "ru" },
      { id: "thalia", name: "Женский", gender: "female", locale: "ru" },
      { id: "helena", name: "Женский (дружелюбный)", gender: "female", locale: "ru" },
    ],
  },
];
