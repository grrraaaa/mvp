/** Подбор голоса по полу 3D-персонажа. */
import type { TtsVoiceGroup } from "@/store/ttsStore";
import { pickVoiceIdForGender, type CharacterGender } from "@/lib/tts/assistantVoices";

export type CharacterStyleId = "human-m" | "human-f";

export function styleIdToGender(styleId: CharacterStyleId): CharacterGender {
  return styleId === "human-m" ? "male" : "female";
}

export function pickVoiceForCharacter(
  groups: TtsVoiceGroup[],
  styleId: CharacterStyleId,
): string | null {
  return pickVoiceIdForGender(groups, styleIdToGender(styleId));
}
