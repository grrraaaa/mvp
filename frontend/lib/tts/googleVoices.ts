import type { TtsVoiceGroup } from "@/store/ttsStore";

/** Синхрон с backend/services/tts/google_voices.py */
export const GOOGLE_DEFAULT_VOICE = "ru-RU-Neural2-B";

export const GOOGLE_VOICE_GROUPS: TtsVoiceGroup[] = [
  {
    id: "google",
    label: "Google",
    voices: [
      { id: "ru-RU-Neural2-B", name: "Мужской", gender: "male", locale: "ru-RU" },
      { id: "ru-RU-Neural2-A", name: "Женский", gender: "female", locale: "ru-RU" },
      { id: "ru-RU-Wavenet-B", name: "Мужской (Wavenet)", gender: "male", locale: "ru-RU" },
      { id: "ru-RU-Wavenet-A", name: "Женский (Wavenet)", gender: "female", locale: "ru-RU" },
    ],
  },
];
