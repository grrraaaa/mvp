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

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set) => ({
      config: envDefault(),
      activePresetId: process.env.NEXT_PUBLIC_CHARACTER_PRESET ?? "banker-m",
      settingsOpen: false,

      setConfig: (patch) =>
        set((state) => ({
          config: { ...state.config, ...patch },
          activePresetId: null,
        })),

      applyPreset: (presetId) => {
        const preset = CHARACTER_PRESETS.find((p) => p.id === presetId);
        if (!preset) return;
        set({ config: { ...preset.config }, activePresetId: presetId });
      },

      resetCharacter: () =>
        set({
          config: { ...DEFAULT_CHARACTER },
          activePresetId: "banker-m",
        }),

      setSettingsOpen: (open) => set({ settingsOpen: open }),
    }),
    {
      name: "sber-ai-character",
      version: 4,
      partialize: (state) => ({
        config: state.config,
        activePresetId: state.activePresetId,
      }),
      migrate: (persisted: unknown, version: number) => {
        if (version < 4) {
          return {
            config: { ...DEFAULT_CHARACTER },
            activePresetId: "banker-m",
          };
        }
        const p = persisted as {
          config?: Partial<AssistantCharacterConfig>;
          activePresetId?: string;
        };
        const modelPath = p?.config?.modelPath ?? DEFAULT_CHARACTER.modelPath;
        return {
          config: {
            ...DEFAULT_CHARACTER,
            ...p?.config,
            modelPath,
            name: displayNameForModel(modelPath),
            styleId: styleIdForModel(modelPath),
          },
          activePresetId: p?.activePresetId ?? "banker-m",
        };
      },
    }
  )
);
