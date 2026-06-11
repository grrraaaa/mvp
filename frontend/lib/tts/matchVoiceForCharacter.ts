/** Подбор TTS-голоса по полу 3D-персонажа. Шарится между characterStore и
 *  useTtsBootstrap, чтобы при любом порядке загрузки (характер раньше голосов
 *  или наоборот) выбранный голос совпадал с полом модели. */
import type { TtsVoiceGroup } from "@/store/ttsStore";

export type CharacterStyleId = "human-m" | "human-f";

/** Возвращает id голоса, подходящего под пол персонажа, или null если
 *  groups ещё не загружены / нет подходящего голоса. */
export function pickVoiceForCharacter(
  groups: TtsVoiceGroup[],
  styleId: CharacterStyleId,
): string | null {
  if (!groups || groups.length === 0) return null;
  const gender = styleId === "human-m" ? "male" : "female";
  // Приоритет: qwen-группа (натуральнее), потом edge.
  const preferred = groups.find((g) => g.id === "qwen") ?? groups[0];
  const match = preferred.voices.find((v) => v.gender === gender);
  return match?.id ?? preferred.voices[0]?.id ?? null;
}
