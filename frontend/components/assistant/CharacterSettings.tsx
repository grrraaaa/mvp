"use client";

import { useMemo } from "react";
import { Mic } from "lucide-react";
import { CHARACTER_PRESETS } from "@/lib/assistant/characterPresets";
import { resolveModelPath, useCharacterStore } from "@/store/characterStore";
import { VoicePicker } from "@/components/assistant/VoicePicker";
import type { CharacterGender } from "@/lib/tts/assistantVoices";
import { PERSONALIZATION_GLB_CATALOG } from "@/store/characterStore";

export function CharacterSettings() {
  const {
    config,
    activePresetId,
    modelOverride,
    settingsOpen,
    setSettingsOpen,
    setConfig,
    applyPreset,
    resetCharacter,
  } = useCharacterStore();

  const characterGender: CharacterGender = useMemo(() => {
    const path = resolveModelPath({ modelOverride, config });
    const model = PERSONALIZATION_GLB_CATALOG.find((m) => m.path === path);
    if (model?.gender) return model.gender;
    return config.styleId === "human-f" ? "female" : "male";
  }, [config, modelOverride]);

  if (!settingsOpen) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col bg-gradient-to-b from-white to-[#f4faf9] backdrop-blur-md border-l border-gray-200 shadow-xl"
      role="dialog"
      aria-label="Способности ИИ-консультанта"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <h3 className="font-semibold text-[#1f1f22]">Способности ИИ</h3>
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
          Выберите набор способностей ИИ-консультанта и голос озвучки (Голос 1 /
          Голос 2 для мужского или женского персонажа).
        </p>

        <section>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            Режим ИИ
          </p>
          <div className="grid grid-cols-1 gap-2">
            {CHARACTER_PRESETS.map((preset) => {
              const active = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`text-left px-3 py-3 rounded-xl border text-sm transition-colors flex items-start gap-3 ${
                    active
                      ? "border-sber-green bg-emerald-50 text-[#1f1f22] ring-1 ring-sber-green/30"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl shrink-0 mt-0.5">
                    {preset.config.emoji ?? "✨"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold">{preset.label}</span>
                    <span className="block text-[10px] text-gray-500 mt-0.5">
                      {preset.config.subtitle}
                    </span>
                    <ul className="mt-1.5 space-y-0.5">
                      {preset.abilities.map((line) => (
                        <li
                          key={line}
                          className="flex items-start gap-1.5 text-[11px] leading-tight text-gray-600"
                        >
                          <span
                            className={`mt-1 inline-block w-1 h-1 rounded-full shrink-0 ${
                              active ? "bg-sber-green" : "bg-gray-400"
                            }`}
                            aria-hidden
                          />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5" />
            Голос озвучки
          </p>
          <VoicePicker characterGender={characterGender} />
        </section>

        <section className="space-y-3">
          <div>
            <span className="text-xs text-gray-500">Имя ассистента</span>
            <div className="mt-1 w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-[#1f1f22] font-semibold">
              {config.name}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Имя привязано к выбранному режиму (Александр / Александра) и не
              редактируется руками.
            </p>
          </div>
          <label className="block">
            <span className="text-xs text-gray-500">Подпись (что умеет)</span>
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
