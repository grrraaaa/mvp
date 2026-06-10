import type { AssistantCharacterConfig } from "./characterTypes";

import { MODEL_PERSONAGE, MODEL_SASHA_LADY1, MODEL_SASHA_LADY2 } from "./glbCharacter";



export interface CharacterPreset {

  id: string;

  label: string;

  config: AssistantCharacterConfig;

}



/** База для мужского персонажа (Александр). Голос: qwen-male. */
const ALEXANDER_BASE: Omit<AssistantCharacterConfig, "subtitle" | "primaryColor" | "accentColor"> = {

  name: "Александр",

  styleId: "human-m",

  emoji: "✨",

  skinTone: "#f5d0b5",

  hairColor: "#3d2314",

  modelPath: MODEL_PERSONAGE,

};

/** База для женского персонажа (Александра, образ 1). Голос: qwen-female. */
const ALEXANDRA_BASE_1: Omit<AssistantCharacterConfig, "subtitle" | "primaryColor" | "accentColor"> = {

  name: "Александра",

  styleId: "human-f",

  emoji: "✨",

  skinTone: "#f5d0b5",

  hairColor: "#3d2314",

  modelPath: MODEL_SASHA_LADY1,

};

/** База для женского персонажа (Александра, образ 2). Голос: qwen-female. */
const ALEXANDRA_BASE_2: Omit<AssistantCharacterConfig, "subtitle" | "primaryColor" | "accentColor"> = {

  name: "Александра",

  styleId: "human-f",

  emoji: "✨",

  skinTone: "#f5d0b5",

  hairColor: "#3d2314",

  modelPath: MODEL_SASHA_LADY2,

};



/**
 * Всего 3 образа консультанта:
 *   1. Александр     (мужской)  — personage.glb
 *   2. Александра    (женский) — textured_sasha_lady1.glb
 *   3. Александра    (женский) — textured_sasha_lady2.glb
 *
 * Голос подбирается автоматически по полу: human-m → qwen-male, human-f → qwen-female.
 * Ручной выбор голоса в UI отключён.
 */
export const CHARACTER_PRESETS: CharacterPreset[] = [

  {

    id: "banker-m",

    label: "Александр",

    config: {

      ...ALEXANDER_BASE,

      subtitle: "Помогу с кредитами, платежами и вкладами",

      primaryColor: "#053517",

      accentColor: "#21A038",

    },

  },

  {

    id: "banker-f",

    label: "Александра",

    config: {

      ...ALEXANDRA_BASE_1,

      subtitle: "Подберу лучшее предложение банка",

      primaryColor: "#0f2f1c",

      accentColor: "#64D072",

    },

  },

  {

    id: "vip",

    label: "Александра",

    config: {

      ...ALEXANDRA_BASE_2,

      subtitle: "Премиальное обслуживание",

      primaryColor: "#1c1917",

      accentColor: "#d4af37",

    },

  },

];



/** Роль в navbar → пресет 3D-консультанта */
export const ROLE_PRESET_MAP: Record<string, string> = {

  manager: "banker-m",

  admin: "banker-f",

  user: "vip",

};



export function getPresetById(id: string): CharacterPreset | undefined {

  return CHARACTER_PRESETS.find((p) => p.id === id);

}
