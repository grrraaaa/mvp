"use client";

import { CHARACTER_PRESETS } from "@/lib/assistant/characterPresets";
import { useCharacterStore } from "@/store/characterStore";
import { AssistantVoicePicker } from "./AssistantVoicePicker";
import { useTtsStore } from "@/store/ttsStore";

export function CharacterSettings() {
  const {
    config,
    activePresetId,
    settingsOpen,
    setSettingsOpen,
    setConfig,
    applyPreset,
    resetCharacter,
  } = useCharacterStore();
  const voiceSelection = useTtsStore((s) => s.voiceSelection);

  if (!settingsOpen) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col bg-gradient-to-b from-white to-[#f4faf9] backdrop-blur-md border-l border-gray-200 shadow-xl"
      role="dialog"
      aria-label="Настройки консультанта"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <h3 className="font-semibold text-[#1f1f22]">Консультант 3D</h3>
        <button
          type="button"
          onClick={() => setSettingsOpen(false)}
          className="text-gray-400 hover:text-gray-700 text-xl leading-none px-2"
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <p className="text-xs text-gray-500 leading-relaxed">
          Выберите один из 3 образов консультанта. Голос подбирается автоматически
          по полу персонажа (Qwen: мужской/женский).
        </p>

        {voiceSelection ? (
          <section>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Голос озвучки</p>
            <AssistantVoicePicker theme="embedded" className="flex-wrap gap-2" />
          </section>
        ) : null}

        <section>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Образ (1 из 3)</p>
          <div className="grid grid-cols-1 gap-2">
            {CHARACTER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`text-left px-3 py-3 rounded-xl border text-sm transition-colors flex items-center gap-3 ${
                  activePresetId === preset.id
                    ? "border-sber-green bg-emerald-50 text-[#1f1f22] ring-1 ring-sber-green/30"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="text-2xl shrink-0">{preset.config.emoji ?? "✨"}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold">{preset.label}</span>
                  <span className="block text-[10px] text-gray-500 mt-0.5">
                    {preset.config.subtitle}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <span className="text-xs text-gray-500">Имя ассистента</span>
            <div className="mt-1 w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-[#1f1f22] font-semibold">
              {config.name}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Имя задаётся выбранным образом: Александр или Александра. Без фамилии.
            </p>
          </div>
          <label className="block">
            <span className="text-xs text-gray-500">Подпись (роль)</span>
            <input
              type="text"
              value={config.subtitle}
              onChange={(e) => setConfig({ subtitle: e.target.value })}
              className="mt-1 w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm text-[#1f1f22] focus:outline-none focus:border-sber-green"
              maxLength={64}
            />
          </label>
        </section>

        <button
          type="button"
          onClick={resetCharacter}
          className="w-full py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-[#1f1f22] hover:border-gray-300"
        >
          Сбросить по умолчанию
        </button>
      </div>
    </div>
  );
}
