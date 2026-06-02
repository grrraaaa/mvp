export type CharacterMood = "idle" | "thinking" | "speaking" | "happy";

/** human-m / human-f — человекоподобный ассистент */
export type CharacterStyleId = "human-m" | "human-f";

export interface AssistantCharacterConfig {
  name: string;
  subtitle: string;
  styleId: CharacterStyleId;
  emoji: string;
  skinTone: string;
  hairColor: string;
  primaryColor: string;
  accentColor: string;
}

export const DEFAULT_CHARACTER: AssistantCharacterConfig = {
  name: "Алексей",
  subtitle: "консультант интернет-банка СберБизнес",
  styleId: "human-m",
  emoji: "👔",
  skinTone: "#e8beac",
  hairColor: "#2a1810",
  primaryColor: "#053517",
  accentColor: "#21A038",
};
