import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_CHARACTER,
  type AssistantCharacterConfig,
} from "@/lib/assistant/characterTypes";
import { CHARACTER_PRESETS } from "@/lib/assistant/characterPresets";
import { displayNameForModel, styleIdForModel } from "@/lib/assistant/glbCharacter";

interface CharacterState {
  config: AssistantCharacterConfig;
  activePresetId: string | null;
  settingsOpen: boolean;
  setConfig: (patch: Partial<AssistantCharacterConfig>) => void;
  applyPreset: (presetId: string) => void;
  resetCharacter: () => void;
  setSettingsOpen: (open: boolean) => void;
}

function envDefault(): AssistantCharacterConfig {
  const presetId = process.env.NEXT_PUBLIC_CHARACTER_PRESET;
  if (!presetId) return DEFAULT_CHARACTER;
  const preset = CHARACTER_PRESETS.find((p) => p.id === presetId);
  return preset?.config ?? DEFAULT_CHARACTER;
}

/** Авто-выбор голоса Qwen по полу модели. Если групп ещё нет — пропускаем. */
function autoPickQwenVoice(styleId: "human-m" | "human-f") {
  if (typeof window === "undefined") return;
  const gender = styleId === "human-m" ? "male" : "female";
  // динамический импорт, чтобы не тянуть ttsStore в SSR
  void import("@/store/ttsStore").then(({ useTtsStore }) => {
    const tts = useTtsStore.getState();
    const groups = tts.voiceGroups;
    if (groups.length === 0) return;
    // Приоритет: qwen-группа, потом edge
    const preferred = groups.find((g) => g.id === "qwen") ?? groups[0];
    const voice = preferred.voices.find((v) => v.gender === gender) ?? preferred.voices[0];
    if (voice && tts.voiceId !== voice.id) {
      tts.setVoiceId(voice.id);
    }
  });
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      config: envDefault(),
      activePresetId: process.env.NEXT_PUBLIC_CHARACTER_PRESET ?? "manager-abilities",
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
        // Автоподбор голоса по полу модели: human-m → qwen-male, human-f → qwen-female.
        autoPickQwenVoice(preset.config.styleId);
      },

      resetCharacter: () => {
        // Через applyPreset — единая логика: и сброс конфига, и перевыбор голоса.
        get().applyPreset("manager-abilities");
      },

      setSettingsOpen: (open) => set({ settingsOpen: open }),
    }),
    {
      name: "sber-ai-character",
      version: 6,
      partialize: (state) => ({
        config: state.config,
        activePresetId: state.activePresetId,
      }),
      migrate: (persisted: unknown, version: number) => {
        // v5 и раньше: полный сброс на новый дефолт (Александр, manager-abilities).
        if (version < 6) {
          return {
            config: { ...DEFAULT_CHARACTER },
            activePresetId: "manager-abilities",
          };
        }
        const p = persisted as {
          config?: Partial<AssistantCharacterConfig>;
          activePresetId?: string;
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
        };
      },
    }
  )
);
