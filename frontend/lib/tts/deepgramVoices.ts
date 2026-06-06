import type { TtsVoiceGroup } from "@/store/ttsStore";

/** Статический каталог (синхрон с backend/services/tts/deepgram_voices.py). */
export const DEEPGRAM_DEFAULT_VOICE = "alexei";

export const DEEPGRAM_VOICE_GROUPS: TtsVoiceGroup[] = [
  {
    id: "deepgram",
    label: "Deepgram Aura",
    voices: [
      { id: "alexei", name: "Alexei", gender: "male" },
      { id: "arcas", name: "Arcas", gender: "male" },
      { id: "odysseus", name: "Odysseus", gender: "male" },
      { id: "orpheus", name: "Orpheus", gender: "male" },
      { id: "apollo", name: "Apollo", gender: "male" },
      { id: "mars", name: "Mars", gender: "male" },
      { id: "thalia", name: "Thalia", gender: "female" },
      { id: "aurora", name: "Aurora", gender: "female" },
      { id: "helena", name: "Helena", gender: "female" },
      { id: "luna", name: "Luna", gender: "female" },
    ],
  },
];
