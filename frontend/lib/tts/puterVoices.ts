import type { TtsVoiceGroup } from "@/store/ttsStore";

/** Языки озвучки Puter.js — как в официальном примере. */
export const PUTER_DEFAULT_LANGUAGE = "en-US";

export const PUTER_LANGUAGES = [
  { id: "en-US", name: "English (US)", locale: "en-US" },
  { id: "fr-FR", name: "French", locale: "fr-FR" },
  { id: "de-DE", name: "German", locale: "de-DE" },
  { id: "es-ES", name: "Spanish", locale: "es-ES" },
  { id: "it-IT", name: "Italian", locale: "it-IT" },
] as const;

export type PuterLanguageId = (typeof PUTER_LANGUAGES)[number]["id"];

export const PUTER_VOICE_GROUPS: TtsVoiceGroup[] = [
  {
    id: "puter",
    label: "Язык озвучки",
    voices: PUTER_LANGUAGES.map((lang) => ({
      id: lang.id,
      name: lang.name,
      locale: lang.locale,
      tier: "puter",
      description: "Puter TTS",
    })),
  },
];

export const PUTER_PREVIEW_PHRASES: Record<PuterLanguageId, string> = {
  "en-US": "Hello! I am your Sber Business assistant.",
  "fr-FR": "Bonjour ! Je suis votre assistant Sber Business.",
  "de-DE": "Hallo! Ich bin Ihr Sber Business Assistent.",
  "es-ES": "¡Hola! Soy su asistente de Sber Business.",
  "it-IT": "Ciao! Sono il tuo assistente Sber Business.",
};

export function puterPreviewPhrase(languageId: string): string {
  return PUTER_PREVIEW_PHRASES[languageId as PuterLanguageId] ?? PUTER_PREVIEW_PHRASES["en-US"];
}
