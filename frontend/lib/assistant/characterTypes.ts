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
  /** GLB в public/models/ */
  modelPath?: string;
}

export const DEFAULT_CHARACTER: AssistantCharacterConfig = {
  name: "Александр",
  subtitle: "консультант интернет-банка СберБизнес",
  styleId: "human-m",
  emoji: "✨",
  skinTone: "#f5d0b5",
  hairColor: "#3d2314",
  primaryColor: "#053517",
  accentColor: "#21A038",
  modelPath: "/models/personage.glb",
};
