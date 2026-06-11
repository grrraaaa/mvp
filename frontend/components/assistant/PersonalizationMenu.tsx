"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Mic,
  UserCircle2,
  User,
  UserRound,
  X,
  RotateCcw,
  Play,
  Square,
  Ellipsis,
} from "lucide-react";
import {
  PERSONALIZATION_GLB_CATALOG,
  resolveModelPath,
  useCharacterStore,
} from "@/store/characterStore";
import { useTtsStore, type TtsVoiceOption } from "@/store/ttsStore";
import { previewVoiceSample, type PreviewHandle } from "@/lib/tts/previewVoice";
import { ModelPreview3D } from "./character3d/ModelPreview3D";

interface Props {
  /** Открыть большую панель «Способности ИИ» (для отдельной кнопки). */
  onOpenAbilities?: () => void;
  /** Компактный режим (узкие места: док, мобильный bottom sheet). */
  compact?: boolean;
}

type ModelGender = "male" | "female";

interface ModelEntry {
  id: string;
  label: string;
  path: string;
  gender: ModelGender;
}

/** Кебаб-меню «⋯» в шапке ассистента: быстрый выбор голоса и внешнего вида
 *  без открытия полной панели CharacterSettings. Полная панель со способностями
 *  вызывается из того же меню. */
export function PersonalizationMenu({ onOpenAbilities }: Props) {
  const [open, setOpen] = useState(false);
  const [previewModel, setPreviewModel] = useState<ModelEntry | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const previewRef = useRef<PreviewHandle | null>(null);
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

  // Останавливаем превью при закрытии меню / размонтировании
  useEffect(() => {
    if (!open) {
      previewRef.current?.stop();
      previewRef.current = null;
      setPlayingVoiceId(null);
      setPreviewModel(null);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      previewRef.current?.stop();
    };
  }, []);

  const currentModelPath = resolveModelPath({ modelOverride, config });

  const activeModel: ModelEntry | undefined = useMemo(
    () => PERSONALIZATION_GLB_CATALOG.find((m) => m.path === currentModelPath),
    [currentModelPath],
  );

  const languageVoices = useMemo(
    () => voiceGroups.flatMap((g) => g.voices),
    [voiceGroups],
  );

  const handleReset = () => {
    previewRef.current?.stop();
    setPlayingVoiceId(null);
    resetCharacter();
  };

  const handleTogglePlayVoice = (v: TtsVoiceOption) => {
    if (playingVoiceId === v.id) {
      previewRef.current?.stop();
      previewRef.current = null;
      setPlayingVoiceId(null);
      return;
    }
    previewRef.current?.stop();
    previewRef.current = previewVoiceSample(v.id);
    setPlayingVoiceId(v.id);
    void previewRef.current.done.finally(() => {
      setPlayingVoiceId((cur) => (cur === v.id ? null : cur));
    });
  };

  // Какая модель показывается в 3D-превью: ховер/фокус → активная.
  const previewTarget = previewModel ?? activeModel ?? null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-8 h-8 flex items-center justify-center rounded text-[#7d838a] hover:bg-[#f2f4f7] hover:text-[#0d6e68] transition-colors"
        title="Меню"
        aria-label="Меню"
        aria-expanded={open}
      >
        <Ellipsis className="w-4 h-4" aria-hidden />
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

          {/* Внешний вид — реальный 3D-превью текущей/наводимой модели */}
          <Section icon={<UserCircle2 className="w-3.5 h-3.5" />} title="Внешний вид">
            <ModelPreview3D modelPath={previewTarget?.path} height={140} />
            <div className="mt-2 flex items-center gap-1.5 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-bold text-gray-800 truncate">
                    {previewTarget?.label ?? "—"}
                  </span>
                  {previewModel && (
                    <span className="text-[9px] uppercase font-bold tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
                      превью
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500">
                  Пол: {previewTarget
                    ? previewTarget.gender === "male"
                      ? "мужской"
                      : "женский"
                    : "—"}{" "}
                  · Голос: {voiceOverride ? "выбран вручную" : "автоподбор"}
                </div>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              {PERSONALIZATION_GLB_CATALOG.map((m) => {
                const isActive = currentModelPath === m.path;
                const isPreviewing = previewModel?.id === m.id;
                const isMale = m.gender === "male";
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModelOverride(m.path)}
                    onMouseEnter={() => setPreviewModel(m)}
                    onMouseLeave={() =>
                      setPreviewModel((cur) => (cur?.id === m.id ? null : cur))
                    }
                    onFocus={() => setPreviewModel(m)}
                    onBlur={() =>
                      setPreviewModel((cur) => (cur?.id === m.id ? null : cur))
                    }
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isActive
                        ? "bg-emerald-50/60 ring-1 ring-sber-green/30"
                        : isPreviewing
                          ? "bg-gray-50"
                          : "hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                        isMale
                          ? "bg-blue-100/80 border-blue-200/60 text-blue-600"
                          : "bg-pink-100/80 border-pink-200/60 text-pink-600"
                      }`}
                      aria-hidden
                    >
                      {isMale ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <UserRound className="w-4 h-4" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold text-gray-800 truncate">
                        {m.label}
                      </span>
                      <span className="block text-[10px] text-gray-500">
                        {isMale ? "Мужской персонаж" : "Женский персонаж"}
                      </span>
                    </span>
                    {isActive && <Check className="w-3.5 h-3.5 text-sber-green shrink-0" />}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Язык озвучки Puter.js */}
          <Section icon={<Mic className="w-3.5 h-3.5" />} title="Язык озвучки">
            {languageVoices.length === 0 ? (
              <p className="text-[10px] text-gray-400 px-1 py-1">
                Список языков загружается…
              </p>
            ) : (
              <div className="space-y-1">
                {languageVoices.map((v) => {
                  const isActive =
                    voiceId === v.id || (voiceOverride === v.id && voiceId !== null);
                  const isPlaying = playingVoiceId === v.id;
                  return (
                    <div
                      key={v.id}
                      className={`flex items-center gap-1.5 px-1.5 py-1 rounded-lg transition-colors ${
                        isActive
                          ? "bg-emerald-50/60 ring-1 ring-sber-green/30"
                          : isPlaying
                            ? "bg-amber-50"
                            : "hover:bg-gray-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setVoiceOverride(v.id)}
                        className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
                        title={isActive ? "Активный язык" : "Выбрать язык"}
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-semibold text-gray-800 truncate">
                            {v.name}
                          </span>
                          <span className="block text-[10px] text-gray-500">{v.locale ?? v.id}</span>
                        </span>
                        {isActive && <Check className="w-3.5 h-3.5 text-sber-green shrink-0" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePlayVoice(v)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isPlaying
                            ? "bg-amber-500 text-white hover:bg-amber-600"
                            : "bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-700"
                        }`}
                        title={isPlaying ? "Остановить" : "Прослушать"}
                        aria-label={isPlaying ? "Остановить" : "Прослушать"}
                      >
                        {isPlaying ? (
                          <Square className="w-3 h-3" aria-hidden />
                        ) : (
                          <Play className="w-3 h-3 ml-0.5" aria-hidden />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {voiceOverride && (
              <button
                type="button"
                onClick={() => setVoiceOverride(null)}
                className="mt-1.5 text-[10px] text-gray-500 hover:text-sber-green underline"
              >
                Вернуть автоподбор языка
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
