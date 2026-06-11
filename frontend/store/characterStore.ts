import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_CHARACTER,
  type AssistantCharacterConfig,
} from "@/lib/assistant/characterTypes";
import { CHARACTER_PRESETS } from "@/lib/assistant/characterPresets";
import {
  CHARACTER_GLB_CATALOG,
  DEFAULT_GLB_PATH,
  displayNameForModel,
  styleIdForModel,
} from "@/lib/assistant/glbCharacter";
import { pickVoiceForCharacter } from "@/lib/tts/matchVoiceForCharacter";

interface CharacterState {
  config: AssistantCharacterConfig;
  activePresetId: string | null;
  /** @deprecated Голос подбирается автоматически по полу персонажа. */
  voiceOverride: string | null;
  /**
   * Ручной выбор GLB-модели (внешнего вида) из UI. Если задан — рендерится
   * вместо `config.modelPath` из пресета. Сбрасывается через
   * `resetCharacter` или явно в null.
   */
  modelOverride: string | null;
  settingsOpen: boolean;
  setConfig: (patch: Partial<AssistantCharacterConfig>) => void;
  applyPreset: (presetId: string) => void;
  resetCharacter: () => void;
  setSettingsOpen: (open: boolean) => void;
  setVoiceOverride: (id: string | null) => void;
  setModelOverride: (path: string | null) => void;
}

function envDefault(): AssistantCharacterConfig {
  const presetId = process.env.NEXT_PUBLIC_CHARACTER_PRESET;
  if (!presetId) return DEFAULT_CHARACTER;
  const preset = CHARACTER_PRESETS.find((p) => p.id === presetId);
  return preset?.config ?? DEFAULT_CHARACTER;
}

/** Эффективный путь к GLB: ручной override → путь из пресета → дефолт. */
export function resolveModelPath(state: {
  modelOverride: string | null;
  config: AssistantCharacterConfig;
}): string {
  return state.modelOverride ?? state.config.modelPath ?? DEFAULT_GLB_PATH;
}

/** Каталог моделей для UI персонализации. */
export const PERSONALIZATION_GLB_CATALOG = CHARACTER_GLB_CATALOG.map((m) => ({
  id: m.id,
  label: m.label,
  path: m.path,
  gender: m.gender,
}));

/** Авто-выбор голоса по полу модели. */
function autoPickVoice(styleId: "human-m" | "human-f") {
  if (typeof window === "undefined") return;
  void import("@/store/ttsStore").then(({ useTtsStore }) => {
    const tts = useTtsStore.getState();
    const voice = pickVoiceForCharacter(tts.voiceGroups, styleId);
    if (voice && tts.voiceId !== voice) {
      tts.setVoiceId(voice);
    }
  });
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      config: envDefault(),
      activePresetId: process.env.NEXT_PUBLIC_CHARACTER_PRESET ?? "manager-abilities",
      voiceOverride: null,
      modelOverride: null,
      settingsOpen: false,

      setConfig: (patch) =>
        // Запрещаем менять `name` через setConfig — имя ассистента фиксировано
        // пресетом (Александр / Александра) и не должно редактироваться руками.
        set((state) => {
          const { name: _ignored, ...rest } = patch;
          return {
            config: { ...state.config, ...rest },
            activePresetId: null,
          };
        }),

      applyPreset: (presetId) => {
        const preset = CHARACTER_PRESETS.find((p) => p.id === presetId);
        if (!preset) return;
        set({ config: { ...preset.config }, activePresetId: presetId });
        autoPickVoice(preset.config.styleId);
      },

      resetCharacter: () => {
        // Через applyPreset — единая логика: и сброс конфига, и перевыбор голоса.
        // Сбрасываем и ручные override'ы — «вернуть как было».
        set({ voiceOverride: null, modelOverride: null });
        get().applyPreset("manager-abilities");
      },

      setSettingsOpen: (open) => set({ settingsOpen: open }),

      setVoiceOverride: (id) => {
        set({ voiceOverride: id });
        if (id) {
          // Сразу применяем в ttsStore, чтобы озвучка сменилась без задержки.
          void import("@/store/ttsStore").then(({ useTtsStore }) => {
            const tts = useTtsStore.getState();
            if (tts.voiceId !== id) tts.setVoiceId(id);
          });
        }
      },

      setModelOverride: (path) => {
        if (!path) {
          set({ modelOverride: null });
          return;
        }
        // При ручном выборе модели подтянем имя/стиль под неё, чтобы голос
        // (если он не override'нут руками) перевыбрался корректно.
        const name = displayNameForModel(path);
        const styleId = styleIdForModel(path);
        set((state) => ({
          modelOverride: path,
          config: { ...state.config, name, styleId },
          activePresetId: null,
          voiceOverride: null,
        }));
        autoPickVoice(styleId);
      },
    }),
    {
      name: "sber-ai-character",
      version: 7,
      partialize: (state) => ({
        config: state.config,
        activePresetId: state.activePresetId,
        voiceOverride: state.voiceOverride,
        modelOverride: state.modelOverride,
      }),
      migrate: (persisted: unknown, version: number) => {
        // v6 и раньше: полный сброс на новый дефолт (Александр, manager-abilities).
        if (version < 7) {
          return {
            config: { ...DEFAULT_CHARACTER },
            activePresetId: "manager-abilities",
            voiceOverride: null,
            modelOverride: null,
          };
        }
        const p = persisted as {
          config?: Partial<AssistantCharacterConfig>;
          activePresetId?: string;
          voiceOverride?: string | null;
          modelOverride?: string | null;
        };
        const modelPath = p?.config?.modelPath ?? DEFAULT_CHARACTER.modelPath;
        // Подстраховка: если в стейте залежался id, которого больше нет
        // (например, ранее удалённые «banker-m» / «casual»), подменяем на дефолтный.
        const activePresetId =
          p?.activePresetId && CHARACTER_PRESETS.some((cp) => cp.id === p.activePresetId)
            ? p.activePresetId
            : "manager-abilities";
        return {
          config: {
            ...DEFAULT_CHARACTER,
            ...p?.config,
            modelPath,
            name: displayNameForModel(modelPath),
            styleId: styleIdForModel(modelPath),
          },
          activePresetId,
          voiceOverride: p?.voiceOverride ?? null,
          modelOverride: p?.modelOverride ?? null,
        };
      },
    }
  )
);
