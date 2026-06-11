import type { TtsVoiceGroup, TtsVoiceOption } from "@/store/ttsStore";

/** Статический фоллбек (синхрон с backend inworld_voices.py). */
export const ASSISTANT_DEFAULT_VOICE = "merry-candle-6309__design-voice-6eaa5889";

export const ASSISTANT_VOICE_GROUPS: TtsVoiceGroup[] = [
  {
    id: "inworld",
    label: "Голос",
    voices: [
      {
        id: "merry-candle-6309__design-voice-6eaa5889",
        name: "Петя (Inworld)",
        short: "Петя",
        gender: "male",
        locale: "ru-RU",
        tier: "inworld",
        description: "Мужской",
        provider: "inworld",
      },
      {
        id: "Ashley",
        name: "Александра (Inworld)",
        short: "Александра",
        gender: "female",
        locale: "ru-RU",
        tier: "inworld",
        description: "Женский",
        provider: "inworld",
      },
    ],
  },
];

export type CharacterGender = "male" | "female";

export function assistantVoiceGroups(groups: TtsVoiceGroup[]): TtsVoiceGroup[] {
  const inworld = groups.find((g) => g.id === "inworld");
  if (inworld?.voices.length) {
    return [{ ...inworld, label: "Голос" }];
  }
  return ASSISTANT_VOICE_GROUPS;
}

export function voiceForGender(
  groups: TtsVoiceGroup[],
  gender: CharacterGender,
): TtsVoiceOption | null {
  const all = assistantVoiceGroups(groups).flatMap((g) => g.voices);
  return all.find((v) => v.gender === gender) ?? all[0] ?? null;
}

export function pickVoiceIdForGender(
  groups: TtsVoiceGroup[],
  gender: CharacterGender,
): string | null {
  return voiceForGender(groups, gender)?.id ?? null;
}
