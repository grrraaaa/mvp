import type { TtsVoiceGroup } from "@/store/ttsStore";

/** Синхрон с backend/services/tts/google_voices.py */
export const GOOGLE_DEFAULT_VOICE = "ru-RU-Wavenet-B";

export const GOOGLE_VOICE_GROUPS: TtsVoiceGroup[] = [
  {
    id: "google",
    label: "Google (русский)",
    voices: [
      { id: "ru-RU-Wavenet-B", name: "Мужской", gender: "male", locale: "ru-RU" },
      { id: "ru-RU-Wavenet-A", name: "Женский", gender: "female", locale: "ru-RU" },
    ],
  },
];
