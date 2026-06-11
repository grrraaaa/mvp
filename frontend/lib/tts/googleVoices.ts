import type { TtsVoiceGroup } from "@/store/ttsStore";

/** Синхрон с backend/services/tts/google_voices.py
 *
 * Каталог включает 3 семейства × 2+ голоса = 10 вариантов:
 *  - Neural2 (премиум, 4 голоса): B/D муж + A/C жен
 *  - Wavenet  (дефолт, 4 голоса):  B/D муж + A/C жен
 *  - Standard (бюджет, 2 голоса):   B муж + A жен
 */
export const GOOGLE_DEFAULT_VOICE = "ru-RU-Wavenet-B";
export const GOOGLE_DEFAULT_FEMALE = "ru-RU-Wavenet-A";

export const GOOGLE_VOICE_GROUPS: TtsVoiceGroup[] = [
  {
    id: "google",
    label: "Google Cloud TTS",
    voices: [
      // Neural2 (премиум)
      { id: "ru-RU-Neural2-B", name: "Дмитрий (Neural2)", short: "Дмитрий", gender: "male", locale: "ru-RU", tier: "neural2" },
      { id: "ru-RU-Neural2-D", name: "Михаил (Neural2)", short: "Михаил", gender: "male", locale: "ru-RU", tier: "neural2" },
      { id: "ru-RU-Neural2-A", name: "Алиса (Neural2)", short: "Алиса", gender: "female", locale: "ru-RU", tier: "neural2" },
      { id: "ru-RU-Neural2-C", name: "Кира (Neural2)", short: "Кира", gender: "female", locale: "ru-RU", tier: "neural2" },
      // Wavenet (дефолт)
      { id: "ru-RU-Wavenet-B", name: "Дмитрий (Wavenet)", short: "Дмитрий", gender: "male", locale: "ru-RU", tier: "wavenet" },
      { id: "ru-RU-Wavenet-D", name: "Михаил (Wavenet)", short: "Михаил", gender: "male", locale: "ru-RU", tier: "wavenet" },
      { id: "ru-RU-Wavenet-A", name: "Алиса (Wavenet)", short: "Алиса", gender: "female", locale: "ru-RU", tier: "wavenet" },
      { id: "ru-RU-Wavenet-C", name: "Кира (Wavenet)", short: "Кира", gender: "female", locale: "ru-RU", tier: "wavenet" },
      // Standard (бюджет)
      { id: "ru-RU-Standard-B", name: "Стандарт (мужской)", short: "Стандарт", gender: "male", locale: "ru-RU", tier: "standard" },
      { id: "ru-RU-Standard-A", name: "Стандарт (женский)", short: "Стандарт", gender: "female", locale: "ru-RU", tier: "standard" },
    ],
  },
];
