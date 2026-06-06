import type { TtsVoiceGroup } from "@/store/ttsStore";

/** Синхрон с backend/services/tts/edge_voices.py */
export const EDGE_DEFAULT_VOICE = "ru-RU-DmitryNeural";

export const EDGE_VOICE_GROUPS: TtsVoiceGroup[] = [
  {
    id: "edge",
    label: "Microsoft (русский)",
    voices: [
      { id: "ru-RU-DmitryNeural", name: "Мужской", gender: "male", locale: "ru-RU" },
      { id: "ru-RU-SvetlanaNeural", name: "Женский", gender: "female", locale: "ru-RU" },
    ],
  },
];
