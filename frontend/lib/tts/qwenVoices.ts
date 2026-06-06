import type { TtsVoiceGroup } from "@/store/ttsStore";

/** Синхрон с backend/services/tts/qwen_voices.py */
export const QWEN_DEFAULT_VOICE = "qwen-male";

export const QWEN_VOICE_GROUPS: TtsVoiceGroup[] = [
  {
    id: "qwen",
    label: "Qwen (русский)",
    voices: [
      { id: "qwen-male", name: "Мужской", gender: "male", locale: "ru-RU" },
      { id: "qwen-female", name: "Женский", gender: "female", locale: "ru-RU" },
    ],
  },
];
