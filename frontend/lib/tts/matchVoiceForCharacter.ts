/** Подбор TTS-голоса по полу 3D-персонажа. Шарится между characterStore и
 *  useTtsBootstrap, чтобы при любом порядке загрузки (характер раньше голосов
 *  или наоборот) выбранный голос совпадал с полом модели. */
import type { TtsVoiceGroup } from "@/store/ttsStore";

export type CharacterStyleId = "human-m" | "human-f";

/** Приоритет провайдеров: google → qwen → edge.
 *  Совпадает с порядком в backend/services/tts/voice_router.py. */
const PROVIDER_PRIORITY = ["google", "qwen", "edge"] as const;

/** Возвращает id голоса, подходящего под пол персонажа, или null если
 *  groups ещё не загружены / нет подходящего голоса. */
export function pickVoiceForCharacter(
  groups: TtsVoiceGroup[],
  styleId: CharacterStyleId,
): string | null {
  if (!groups || groups.length === 0) return null;
  const gender = styleId === "human-m" ? "male" : "female";

  // Идём по приоритету провайдеров: первый, в котором есть нужный пол — выигрывает.
  for (const providerId of PROVIDER_PRIORITY) {
    const group = groups.find((g) => g.id === providerId);
    if (!group) continue;
    const match = group.voices.find((v) => v.gender === gender);
    if (match) return match.id;
    // Если в приоритетной группе нет нужного пола — не падаем, а смотрим следующую
    // группу по приоритету. Последний шанс — берём первый голос группы.
    if (group.voices.length > 0) {
      return group.voices[0].id;
    }
  }

  // Совсем крайний случай: нет ни одной знакомой группы — берём первый попавшийся голос.
  return groups[0]?.voices[0]?.id ?? null;
}
