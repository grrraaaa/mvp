import type { AssistantCharacterConfig } from "./characterTypes";
import { MODEL_PERSONAGE, MODEL_SASHA_LADY1, MODEL_SASHA_LADY2 } from "./glbCharacter";

export interface CharacterPreset {
  id: string;
  label: string;
  config: AssistantCharacterConfig;
}

const ALEXANDRA_BASE: Omit<AssistantCharacterConfig, "subtitle" | "modelPath" | "primaryColor" | "accentColor"> = {
  name: "Александра",
  styleId: "human-f",
  emoji: "✨",
  skinTone: "#f5d0b5",
  hairColor: "#3d2314",
};

const ALEXANDER_BASE: Omit<AssistantCharacterConfig, "subtitle" | "primaryColor" | "accentColor"> = {
  name: "Александр",
  styleId: "human-m",
  emoji: "✨",
  skinTone: "#f5d0b5",
  hairColor: "#3d2314",
  modelPath: MODEL_PERSONAGE,
};

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: "banker-m",
    label: "Александр — консультант",
    config: {
      ...ALEXANDER_BASE,
      subtitle: "Помогу с кредитами, платежами и вкладами",
      primaryColor: "#053517",
      accentColor: "#21A038",
    },
  },
  {
    id: "banker-f",
    label: "Александра — менеджер",
    config: {
      ...ALEXANDRA_BASE,
      subtitle: "Подберу лучшее предложение банка",
      primaryColor: "#0f2f1c",
      accentColor: "#64D072",
      modelPath: MODEL_SASHA_LADY1,
    },
  },
  {
    id: "vip",
    label: "Александра — VIP",
    config: {
      ...ALEXANDRA_BASE,
      subtitle: "Премиальное обслуживание",
      primaryColor: "#1c1917",
      accentColor: "#d4af37",
      modelPath: MODEL_SASHA_LADY2,
    },
  },
  {
    id: "casual",
    label: "Александра — дружелюбная",
    config: {
      ...ALEXANDRA_BASE,
      subtitle: "Объясню простыми словами",
      primaryColor: "#0f766e",
      accentColor: "#99f6e4",
      modelPath: MODEL_SASHA_LADY2,
    },
  },
];

/** Роль в navbar → пресет 3D-консультанта */
export const ROLE_PRESET_MAP: Record<string, string> = {
  manager: "banker-m",
  admin: "banker-f",
  user: "casual",
};

export function getPresetById(id: string): CharacterPreset | undefined {
  return CHARACTER_PRESETS.find((p) => p.id === id);
}
