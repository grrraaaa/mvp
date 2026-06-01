"use client";

import { CHARACTER_PRESETS } from "@/lib/assistant/characterPresets";
import type { CharacterStyleId } from "@/lib/assistant/characterTypes";
import { useCharacterStore } from "@/store/characterStore";

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

  if (!settingsOpen) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col bg-gray-950/95 backdrop-blur-md border-l border-white/10"
      role="dialog"
      aria-label="Настройки консультанта"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="font-semibold text-white">Консультант 3D</h3>
        <button
          type="button"
          onClick={() => setSettingsOpen(false)}
          className="text-gray-400 hover:text-white text-xl leading-none px-2"
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <p className="text-xs text-gray-400 leading-relaxed">
          Загружена модель <span className="text-sber-green-light">personage.glb</span> из
          public/models/. Без анимаций в файле — лёгкое покачивание и речь через облачко;
          липсинг включится, если в модели появятся morph targets.
        </p>

        <section>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Пресеты</p>
          <div className="grid grid-cols-2 gap-2">
            {CHARACTER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
                  activePresetId === preset.id
                    ? "border-blue-500 bg-blue-500/20 text-white"
                    : "border-white/10 bg-white/5 text-gray-300 hover:border-white/20"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <label className="block">
            <span className="text-xs text-gray-500">Имя</span>
            <input
              type="text"
              value={config.name}
              onChange={(e) => setConfig({ name: e.target.value })}
              className="mt-1 w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white"
              maxLength={32}
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Подпись</span>
            <input
              type="text"
              value={config.subtitle}
              onChange={(e) => setConfig({ subtitle: e.target.value })}
              className="mt-1 w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white"
              maxLength={64}
            />
          </label>
        </section>

        <section>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Внешность</p>
          <div className="flex gap-2 mb-3">
            {(
              [
                { id: "human-m" as CharacterStyleId, label: "Мужчина" },
                { id: "human-f" as CharacterStyleId, label: "Женщина" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setConfig({ styleId: opt.id })}
                className={`flex-1 py-2 rounded-lg text-sm border ${
                  config.styleId === opt.id
                    ? "border-blue-500 bg-blue-500/20 text-white"
                    : "border-white/10 text-gray-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-500">Кожа</span>
            <input
              type="color"
              value={config.skinTone ?? "#e8beac"}
              onChange={(e) => setConfig({ skinTone: e.target.value })}
              className="mt-1 w-full h-10 rounded-lg cursor-pointer bg-transparent"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Волосы</span>
            <input
              type="color"
              value={config.hairColor ?? "#2a1810"}
              onChange={(e) => setConfig({ hairColor: e.target.value })}
              className="mt-1 w-full h-10 rounded-lg cursor-pointer bg-transparent"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Костюм</span>
            <input
              type="color"
              value={config.primaryColor}
              onChange={(e) => setConfig({ primaryColor: e.target.value })}
              className="mt-1 w-full h-10 rounded-lg cursor-pointer bg-transparent"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Рубашка / акцент</span>
            <input
              type="color"
              value={config.accentColor}
              onChange={(e) => setConfig({ accentColor: e.target.value })}
              className="mt-1 w-full h-10 rounded-lg cursor-pointer bg-transparent"
            />
          </label>
        </section>

        <button
          type="button"
          onClick={resetCharacter}
          className="w-full py-2 text-sm text-gray-400 border border-white/10 rounded-lg hover:text-white hover:border-white/20"
        >
          Сбросить по умолчанию
        </button>
      </div>
    </div>
  );
}
