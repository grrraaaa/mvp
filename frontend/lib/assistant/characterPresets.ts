import type { AssistantCharacterConfig } from "./characterTypes";

import { MODEL_PERSONAGE, MODEL_SASHA_LADY1, MODEL_SASHA_LADY2 } from "./glbCharacter";



export interface CharacterPreset {

  id: string;

  label: string;

  /** Краткое описание «что умеет этот режим ИИ» — показывается в карточке выбора. */
  abilities: string[];

  config: AssistantCharacterConfig;

}



/** База для мужского персонажа (Александр). Голос: qwen-male. */
const ALEXANDER_BASE: Omit<AssistantCharacterConfig, "subtitle" | "primaryColor" | "accentColor"> = {

  name: "Александр",

  styleId: "human-m",

  emoji: "🧑‍💼",

  skinTone: "#f5d0b5",

  hairColor: "#3d2314",

  modelPath: MODEL_PERSONAGE,

};

/** База для женского персонажа (Александра, образ 1). Голос: qwen-female. */
const ALEXANDRA_BASE_1: Omit<AssistantCharacterConfig, "subtitle" | "primaryColor" | "accentColor"> = {

  name: "Александра",

  styleId: "human-f",

  emoji: "🧑‍💻",

  skinTone: "#f5d0b5",

  hairColor: "#3d2314",

  modelPath: MODEL_SASHA_LADY1,

};

/** База для женского персонажа (Александра, образ 2). Голос: qwen-female. */
const ALEXANDRA_BASE_2: Omit<AssistantCharacterConfig, "subtitle" | "primaryColor" | "accentColor"> = {

  name: "Александра",

  styleId: "human-f",

  emoji: "🧾",

  skinTone: "#f5d0b5",

  hairColor: "#3d2314",

  modelPath: MODEL_SASHA_LADY2,

};



/**
 * Три режима работы ИИ-консультанта — выбор СПОСОБНОСТЕЙ ассистента, а не
 * просто «образа». Голос и 3D-модель подбираются под выбранный режим:
 *
 *   1. Руководитель         (Александр)     — personage.glb, qwen-male
 *      → подписи, платежи, выплаты, открытие счетов и продуктов
 *
 *   2. Операционный админ   (Александра)    — textured_sasha_lady1.glb, qwen-female
 *      → безопасность, IP/ЭЦП, API-ключи, сервисы, сотрудники
 *
 *   3. ИП                   (Александра)    — textured_sasha_lady2.glb, qwen-female
 *      → черновики документов, проверка контрагентов, выписки
 *
 * Голос подбирается автоматически по полу: human-m → qwen-male, human-f → qwen-female.
 * Ручной выбор голоса в UI отключён.
 */
export const CHARACTER_PRESETS: CharacterPreset[] = [

  {
    id: "manager-abilities",
    label: "Руководитель",
    abilities: [
      "Подписание финансовых документов",
      "Платежи и выплаты (зарплата, контрагенты)",
      "Открытие счетов и продуктов",
    ],
    config: {
      ...ALEXANDER_BASE,
      subtitle: "Полный доступ: подписи, платежи, счета",
      primaryColor: "#053517",
      accentColor: "#21A038",
    },
  },

  {
    id: "admin-abilities",
    label: "Операционный админ",
    abilities: [
      "Безопасность, IP/ЭЦП, API-ключи",
      "Управление сервисами и сотрудниками",
      "Настройка и редактирование счетов",
    ],
    config: {
      ...ALEXANDRA_BASE_1,
      subtitle: "Настройки, безопасность, команда",
      primaryColor: "#0f2f1c",
      accentColor: "#64D072",
    },
  },

  {
    id: "ip-abilities",
    label: "ИП",
    abilities: [
      "Черновики документов и шаблоны",
      "Проверка контрагентов",
      "Просмотр выписок и аналитика",
    ],
    config: {
      ...ALEXANDRA_BASE_2,
      subtitle: "Черновики, контрагенты, выписки",
      primaryColor: "#1c1917",
      accentColor: "#d4af37",
    },
  },

];



/** Роль в navbar → режим способностей ИИ в чате. */
export const ROLE_PRESET_MAP: Record<string, string> = {

  manager: "manager-abilities",

  admin: "admin-abilities",

  user: "ip-abilities",

};



export function getPresetById(id: string): CharacterPreset | undefined {

  return CHARACTER_PRESETS.find((p) => p.id === id);

}
