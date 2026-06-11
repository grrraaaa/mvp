import type { TtsVoiceGroup } from "@/store/ttsStore";

/** Синхрон с backend/services/tts/qwen_voices.py
 *
 * 2 Qwen-голоса (м/ж) + 5 CosyVoice вариантов (3 м + 2 ж).
 */
export const QWEN_DEFAULT_VOICE = "qwen-male";
export const QWEN_DEFAULT_FEMALE = "qwen-female";

export const QWEN_VOICE_GROUPS: TtsVoiceGroup[] = [
  {
    id: "qwen",
    label: "Qwen / CosyVoice",
    voices: [
      // Qwen TTS
      { id: "qwen-male", name: "Алексей (Qwen)", short: "Алексей", gender: "male", locale: "ru-RU", tier: "qwen" },
      { id: "qwen-female", name: "Светлана (Qwen)", short: "Светлана", gender: "female", locale: "ru-RU", tier: "qwen" },
      // CosyVoice (мужские)
      { id: "qwen-cosy-longanyang", name: "Лунъян (CosyVoice)", short: "Лунъян", gender: "male", locale: "ru-RU", tier: "cosyvoice" },
      { id: "qwen-cosy-longhua", name: "Лунхуа (CosyVoice)", short: "Лунхуа", gender: "male", locale: "ru-RU", tier: "cosyvoice" },
      { id: "qwen-cosy-longshu", name: "Луншу (CosyVoice)", short: "Луншу", gender: "male", locale: "ru-RU", tier: "cosyvoice" },
      // CosyVoice (женские)
      { id: "qwen-cosy-longwan", name: "Лунвань (CosyVoice)", short: "Лунвань", gender: "female", locale: "ru-RU", tier: "cosyvoice" },
      { id: "qwen-cosy-longxiaocheng", name: "Лунсяочэн (CosyVoice)", short: "Лунсяочэн", gender: "female", locale: "ru-RU", tier: "cosyvoice" },
    ],
  },
];
