import type { TtsVoiceGroup, TtsVoiceOption } from "@/store/ttsStore";

/** Статический фоллбек (синхрон с backend inworld_voices.py). */
export const ASSISTANT_DEFAULT_VOICE = "Nikolai";

export const ASSISTANT_VOICE_GROUPS: TtsVoiceGroup[] = [
  {
    id: "inworld",
    label: "Голос",
    voices: [
      {
        id: "Nikolai",
        name: "Голос 1",
        short: "Голос 1",
        gender: "male",
        locale: "ru-RU",
        tier: "inworld",
        description: "Мужской · Nikolai",
        provider: "inworld",
      },
      {
        id: "merry-candle-6309__design-voice-4147f476",
        name: "Голос 2",
        short: "Голос 2",
        gender: "male",
        locale: "ru-RU",
        tier: "inworld",
        description: "Мужской · design voice",
        provider: "inworld",
      },
      {
        id: "Svetlana",
        name: "Голос 1",
        short: "Голос 1",
        gender: "female",
        locale: "ru-RU",
        tier: "inworld",
        description: "Женский · Svetlana",
        provider: "inworld",
      },
      {
        id: "Elena",
        name: "Голос 2",
        short: "Голос 2",
        gender: "female",
        locale: "ru-RU",
        tier: "inworld",
        description: "Женский · Elena",
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

export function allAssistantVoices(groups: TtsVoiceGroup[]): TtsVoiceOption[] {
  return assistantVoiceGroups(groups).flatMap((g) => g.voices);
}

export function voicesForGender(
  groups: TtsVoiceGroup[],
  gender: CharacterGender,
): TtsVoiceOption[] {
  return allAssistantVoices(groups)
    .filter((v) => v.gender === gender)
    .sort((a, b) => voiceSlot(a) - voiceSlot(b));
}

function voiceSlot(v: TtsVoiceOption): number {
  const short = (v.short ?? v.name ?? "").toLowerCase();
  if (short.includes("2")) return 2;
  return 1;
}

export function voiceForGender(
  groups: TtsVoiceGroup[],
  gender: CharacterGender,
): TtsVoiceOption | null {
  return voicesForGender(groups, gender)[0] ?? null;
}

export function pickVoiceIdForGender(
  groups: TtsVoiceGroup[],
  gender: CharacterGender,
): string | null {
  return voiceForGender(groups, gender)?.id ?? null;
}

/** Сохранить слот (Голос 1/2) при смене пола персонажа. */
export function pickVoiceForGenderPreservingSlot(
  groups: TtsVoiceGroup[],
  gender: CharacterGender,
  currentVoiceId: string | null | undefined,
): string | null {
  const options = voicesForGender(groups, gender);
  if (!options.length) return null;
  const current = allAssistantVoices(groups).find((v) => v.id === currentVoiceId);
  const slot = current ? voiceSlot(current) : 1;
  return options.find((v) => voiceSlot(v) === slot)?.id ?? options[0].id;
}
