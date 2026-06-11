"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mic, UserCircle2, X, RotateCcw } from "lucide-react";
import { IconMoreVertical } from "@/components/sbbol/SbbolIcons";
import {
  PERSONALIZATION_GLB_CATALOG,
  resolveModelPath,
  useCharacterStore,
} from "@/store/characterStore";
import { useTtsStore } from "@/store/ttsStore";

interface Props {
  /** Открыть большую панель «Способности ИИ» (для отдельной кнопки). */
  onOpenAbilities?: () => void;
  /** Компактный режим (плавающий чат, узкие места). */
  compact?: boolean;
}

/** Кебаб-меню «⋯» в шапке ассистента: быстрый выбор голоса и внешнего вида
 *  без открытия полной панели CharacterSettings. Полная панель со способностями
 *  вызывается из того же меню. */
export function PersonalizationMenu({ onOpenAbilities, compact }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { config, modelOverride, voiceOverride, setVoiceOverride, setModelOverride, resetCharacter } =
    useCharacterStore();
  const voiceGroups = useTtsStore((s) => s.voiceGroups);
  const voiceId = useTtsStore((s) => s.voiceId);

  // Закрытие по клику снаружи / Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const currentModelPath = resolveModelPath({ modelOverride, config });

  const handleReset = () => {
    resetCharacter();
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`${
          compact ? "w-7 h-7" : "w-9 h-9"
        } rounded-full bg-white border border-[#e4e8eb] text-[#7d838a] hover:text-[#008064] hover:border-[#008064]/40 flex items-center justify-center transition-colors`}
        title="Персонализация ассистента"
        aria-label="Персонализация ассистента"
        aria-expanded={open}
      >
        <IconMoreVertical className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-40 w-[min(20rem,calc(100vw-1.5rem))] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-fadeIn"
          role="menu"
        >
          <div className="px-4 py-2.5 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500">
                Персонализация
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                Голос и внешний вид ассистента
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              aria-label="Закрыть"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Внешний вид */}
          <Section icon={<UserCircle2 className="w-3.5 h-3.5" />} title="Внешний вид">
            <div className="space-y-1">
              {PERSONALIZATION_GLB_CATALOG.map((m) => {
                const isActive = currentModelPath === m.path;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModelOverride(m.path)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isActive
                        ? "bg-emerald-50/60 ring-1 ring-sber-green/30"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-200/60 flex items-center justify-center text-sm shrink-0"
                      aria-hidden
                    >
                      {m.gender === "male" ? "🧑" : "👩"}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold text-gray-800 truncate">
                        {m.label}
                      </span>
                      <span className="block text-[10px] text-gray-500">
                        Голос автоматически:{" "}
                        {m.gender === "male" ? "мужской" : "женский"}
                      </span>
                    </span>
                    {isActive && <Check className="w-3.5 h-3.5 text-sber-green shrink-0" />}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Голос */}
          <Section icon={<Mic className="w-3.5 h-3.5" />} title="Голос">
            {voiceGroups.length === 0 ? (
              <p className="text-[10px] text-gray-400 px-1 py-1">
                Список голосов ещё не загружен — попробуйте чуть позже.
              </p>
            ) : (
              <div className="space-y-2">
                {voiceGroups.map((group) => (
                  <div key={group.id}>
                    <div className="text-[9px] uppercase font-bold tracking-wider text-gray-400 mb-1">
                      {group.label}
                    </div>
                    <div className="space-y-1">
                      {group.voices.map((v) => {
                        const isActive =
                          voiceId === v.id ||
                          (voiceOverride === v.id && voiceId !== null);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setVoiceOverride(v.id)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                              isActive
                                ? "bg-emerald-50/60 ring-1 ring-sber-green/30"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                                v.gender === "female"
                                  ? "bg-pink-100 text-pink-600"
                                  : "bg-blue-100 text-blue-600"
                              }`}
                              aria-hidden
                            >
                              {v.gender === "female" ? "♀" : "♂"}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-xs font-semibold text-gray-800 truncate">
                                {v.name}
                              </span>
                              {v.locale && (
                                <span className="block text-[10px] text-gray-500">
                                  {v.locale}
                                </span>
                              )}
                            </span>
                            {isActive && <Check className="w-3.5 h-3.5 text-sber-green shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {voiceOverride && (
              <button
                type="button"
                onClick={() => setVoiceOverride(null)}
                className="mt-1.5 text-[10px] text-gray-500 hover:text-sber-green underline"
              >
                Вернуть автоподбор голоса
              </button>
            )}
          </Section>

          <div className="border-t border-gray-100 bg-slate-50 px-2 py-1.5 flex items-center justify-between gap-1">
            {onOpenAbilities && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenAbilities();
                }}
                className="text-[11px] text-gray-600 hover:text-sber-green px-2 py-1.5 rounded hover:bg-white"
              >
                Способности ИИ…
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="ml-auto text-[11px] text-gray-500 hover:text-sber-green px-2 py-1.5 rounded hover:bg-white flex items-center gap-1"
              title="Сбросить голос, модель и способности"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-3 py-2.5 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">
        <span className="text-gray-400">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}
