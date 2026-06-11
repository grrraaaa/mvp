/** Подбор языка озвучки Puter по полу 3D-персонажа (если нет ручного выбора). */
import type { TtsVoiceGroup } from "@/store/ttsStore";
import { PUTER_DEFAULT_LANGUAGE } from "@/lib/tts/puterVoices";

export type CharacterStyleId = "human-m" | "human-f";

const STYLE_DEFAULT_LANGUAGE: Record<CharacterStyleId, string> = {
  "human-m": "en-US",
  "human-f": "fr-FR",
};

export function pickVoiceForCharacter(
  groups: TtsVoiceGroup[],
  styleId: CharacterStyleId,
): string | null {
  const group = groups.find((g) => g.id === "puter") ?? groups[0];
  if (!group?.voices.length) return PUTER_DEFAULT_LANGUAGE;

  const wanted = STYLE_DEFAULT_LANGUAGE[styleId] ?? PUTER_DEFAULT_LANGUAGE;
  if (group.voices.some((v) => v.id === wanted)) return wanted;
  return group.voices[0]?.id ?? PUTER_DEFAULT_LANGUAGE;
}
