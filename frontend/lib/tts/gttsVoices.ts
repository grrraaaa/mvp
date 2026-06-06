import type { TtsVoiceGroup } from "@/store/ttsStore";

/** Статический каталог (синхрон с backend/services/tts/gtts_voices.py). */
export const GTTS_DEFAULT_VOICE = "ru-male";

export const GTTS_VOICE_GROUPS: TtsVoiceGroup[] = [
  {
    id: "gtts",
    label: "Google Translate TTS",
    voices: [
      { id: "ru-male", name: "Мужской", gender: "male", locale: "ru-RU" },
      { id: "ru-female", name: "Женский", gender: "female", locale: "ru-RU" },
    ],
  },
];
