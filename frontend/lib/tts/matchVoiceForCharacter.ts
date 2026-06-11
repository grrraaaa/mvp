/** Подбор голоса по полу 3D-персонажа. */
import type { TtsVoiceGroup } from "@/store/ttsStore";
import {
  pickVoiceForGenderPreservingSlot,
  type CharacterGender,
} from "@/lib/tts/assistantVoices";

export type CharacterStyleId = "human-m" | "human-f";

export function styleIdToGender(styleId: CharacterStyleId): CharacterGender {
  return styleId === "human-m" ? "male" : "female";
}

export function pickVoiceForCharacter(
  groups: TtsVoiceGroup[],
  styleId: CharacterStyleId,
  currentVoiceId?: string | null,
): string | null {
  const gender = styleIdToGender(styleId);
  return pickVoiceForGenderPreservingSlot(groups, gender, currentVoiceId);
}
