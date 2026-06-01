import type { AssistantCharacterConfig } from "./characterTypes";

export interface CharacterPreset {
  id: string;
  label: string;
  config: AssistantCharacterConfig;
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: "banker-m",
    label: "Консультант (муж.)",
    config: {
      name: "Алексей",
      subtitle: "Помогу с кредитами и вкладами",
      styleId: "human-m",
      emoji: "👔",
      skinTone: "#e8beac",
      hairColor: "#2a1810",
      primaryColor: "#053517",
      accentColor: "#21A038",
    },
  },
  {
    id: "banker-f",
    label: "Консультант (жен.)",
    config: {
      name: "Мария",
      subtitle: "Подберу лучшее предложение банка",
      styleId: "human-f",
      emoji: "👩‍💼",
      skinTone: "#f5d0b5",
      hairColor: "#3d2314",
      primaryColor: "#0f2f1c",
      accentColor: "#64D072",
    },
  },
  {
    id: "vip",
    label: "VIP-менеджер",
    config: {
      name: "Виктор",
      subtitle: "Премиальное обслуживание",
      styleId: "human-m",
      emoji: "🎩",
      skinTone: "#ddb896",
      hairColor: "#1a1a1a",
      primaryColor: "#1c1917",
      accentColor: "#d4af37",
    },
  },
  {
    id: "casual",
    label: "Дружелюбный стиль",
    config: {
      name: "Дарья",
      subtitle: "Спросите — объясню простыми словами",
      styleId: "human-f",
      emoji: "😊",
      skinTone: "#f0c8a8",
      hairColor: "#8b4513",
      primaryColor: "#0f766e",
      accentColor: "#99f6e4",
    },
  },
];

export function getPresetById(id: string): CharacterPreset | undefined {
  return CHARACTER_PRESETS.find((p) => p.id === id);
}
