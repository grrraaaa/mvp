/** Имена morph targets и анимаций — подбираются по подстроке (lower case). */

import type { CharacterStyleId } from "./characterTypes";

export const MODEL_PERSONAGE = "/models/personage.glb";
export const MODEL_SASHA_LADY1 = "/models/textured_sasha_lady1.glb";
export const MODEL_SASHA_LADY2 = "/models/textured_sasha_lady2.glb";

export const CHARACTER_GLB_CATALOG = [
  { id: "alexander", label: "Александр", path: MODEL_PERSONAGE, gender: "male" as const },
  { id: "alexandra1", label: "Александра (образ 1)", path: MODEL_SASHA_LADY1, gender: "female" as const },
  { id: "alexandra2", label: "Александра (образ 2)", path: MODEL_SASHA_LADY2, gender: "female" as const },
] as const;

export function displayNameForModel(modelPath?: string): string {
  return modelPath === MODEL_PERSONAGE ? "Александр" : "Александра";
}

export function styleIdForModel(modelPath?: string): CharacterStyleId {
  return modelPath === MODEL_PERSONAGE ? "human-m" : "human-f";
}

export const DEFAULT_GLB_PATH =
  process.env.NEXT_PUBLIC_CHARACTER_GLB ?? MODEL_PERSONAGE;

/**
 * personage.glb (Sketchfab scan): 3 меша (Object_5–7), full-body ~1.9 m,
 * без morph targets и без клипов. Рот — ProceduralMouth + analyzeHead anchor.
 */
export const GLB_TARGET_HEIGHT = 1.65;

/** Доп. множитель после авто-подгонки (если модель всё ещё крупная/мелкая) */
export const GLB_SCALE_MULTIPLIER = Number(
  process.env.NEXT_PUBLIC_CHARACTER_GLB_SCALE ?? "1"
);

/** Ручная подстройка Y поверх авто-fit */
export const GLB_Y_OFFSET = Number(process.env.NEXT_PUBLIC_CHARACTER_GLB_Y ?? "0");

/** Доп. масштаб в режиме крупного плана лица */
export const PORTRAIT_FACE_SCALE = Number(
  process.env.NEXT_PUBLIC_CHARACTER_PORTRAIT_SCALE ?? "1.6"
);

/** Мировая высота центра головы в портретном режиме */
export const PORTRAIT_HEAD_WORLD_Y = 1.45;

/** Смещение камеры по Y от центра головы (положительное = камера выше).
 *  Дефолт: камера приподнята на ~40 см над макушкой — лёгкий «верхний» ракурс. */
export const PORTRAIT_CAMERA_Y_OFFSET = Number(
  process.env.NEXT_PUBLIC_PORTRAIT_CAMERA_Y_OFFSET ?? "0.40",
);

/** Точка взгляда OrbitControls по Y от центра головы.
 *  Чуть ниже макушки, чтобы взгляд падал на лицо/плечи. */
export const PORTRAIT_TARGET_Y_OFFSET = Number(
  process.env.NEXT_PUBLIC_PORTRAIT_TARGET_Y_OFFSET ?? "-0.05",
);

/**
 * Дистанция камеры (Z) — чем больше, тем дальше персонаж (видно больше фигуры).
 * Переопределение: NEXT_PUBLIC_PORTRAIT_CAMERA_Z / NEXT_PUBLIC_PORTRAIT_CAMERA_Z_COMPACT
 */
export const PORTRAIT_CAMERA_Z = Number(
  process.env.NEXT_PUBLIC_PORTRAIT_CAMERA_Z ?? "5.0",
);
export const PORTRAIT_CAMERA_Z_COMPACT = Number(
  process.env.NEXT_PUBLIC_PORTRAIT_CAMERA_Z_COMPACT ?? "5.4",
);
export const PORTRAIT_CAMERA_FOV = Number(
  process.env.NEXT_PUBLIC_PORTRAIT_CAMERA_FOV ?? "42",
);

/** Фон канваса в портретном режиме */
export const PORTRAIT_BG_DARK = "#030a08";
export const PORTRAIT_BG_EMBEDDED = "#0a1512";

/** @deprecated используйте GLB_SCALE_MULTIPLIER */
export const GLB_SCALE = GLB_SCALE_MULTIPLIER;

/** Подстроки имён morph target (порядок: более специфичные раньше).
 *  НЕ включаем brow/eye/cheek/... — иначе лип-синк будет дёргать брови. */
export const LIP_MORPH_NAMES = [
  "jawopen",
  "jaw_open",
  "mouthopen",
  "mouth_open",
  "mouth.open",
  "viseme_aa",
  "viseme_o",
  "viseme_e",
  "viseme_oh",
  "viseme_u",
  "viseme_pp",
  "vrc.v_aa",
  "vrc.v_oh",
  "vrc.v_ee",
  "mouthsmile",
  "mouthfrown",
  "mouthfunnel",
  "mouthpucker",
  "lip",
  "jaw",
  "mouth",
];

/** Имена morph target, которые НЕ являются ртом — фильтруем на этапе collect. */
const LIP_MORPH_EXCLUDE = ["brow", "eye", "cheek", "blink", "squint", "nose"];

export const ANIM_IDLE_HINTS = ["idle", "standing", "breath"];
export const ANIM_WALK_HINTS = ["walk", "walking"];
export const ANIM_TALK_HINTS = ["talk", "speaking", "speak"];

export function findClipName(
  names: string[],
  hints: string[]
): string | undefined {
  const lower = names.map((n) => n.toLowerCase());
  for (const hint of hints) {
    const idx = lower.findIndex((n) => n.includes(hint));
    if (idx >= 0) return names[idx];
  }
  return names[0];
}

export type LipBinding = { meshIndex: number; morphIndex: number; key: string };

/** Все morph targets на всех мешах, чьи имена совпадают с LIP_MORPH_NAMES. */
export function collectLipBindings(
  meshes: Array<{
    morphTargetDictionary?: Record<string, number>;
  }>
): LipBinding[] {
  const bindings: LipBinding[] = [];
  const seen = new Set<string>();

  meshes.forEach((mesh, meshIndex) => {
    const dict = mesh.morphTargetDictionary;
    if (!dict) return;

    for (const key of Object.keys(dict)) {
      const lower = key.toLowerCase();
      if (!LIP_MORPH_NAMES.some((hint) => lower.includes(hint))) continue;
      // Не считаем брови/глаза/etc. частью рта
      if (LIP_MORPH_EXCLUDE.some((ex) => lower.includes(ex))) continue;

      const morphIndex = dict[key];
      const token = `${meshIndex}:${morphIndex}`;
      if (seen.has(token)) continue;
      seen.add(token);
      bindings.push({ meshIndex, morphIndex, key });
    }
  });

  return bindings;
}

/** Список всех morph target имён (отладка / подбор LIP_MORPH_NAMES). */
export function listMorphTargetNames(
  meshes: Array<{ morphTargetDictionary?: Record<string, number> }>
): string[] {
  const names = new Set<string>();
  for (const mesh of meshes) {
    if (!mesh.morphTargetDictionary) continue;
    for (const key of Object.keys(mesh.morphTargetDictionary)) {
      names.add(key);
    }
  }
  return [...names].sort();
}
