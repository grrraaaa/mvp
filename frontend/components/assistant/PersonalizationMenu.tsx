"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Mic,
  UserCircle2,
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
export function PersonalizationMenu({ onOpenAbilities, compact }: Props) {
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

  // Пол, по которому фильтруем голоса. Если юзер наводит на пункт модели —
  // берём её пол; иначе — пол текущей активной модели.
  const filteredGender: ModelGender | undefined =
    previewModel?.gender ?? activeModel?.gender;

  const filteredVoiceGroups = useMemo(() => {
    if (!filteredGender) return voiceGroups;
    return voiceGroups
      .map((g) => ({
        ...g,
        voices: g.voices.filter((v) => v.gender === filteredGender),
      }))
      .filter((g) => g.voices.length > 0);
  }, [voiceGroups, filteredGender]);

  const totalVoicesForGender = useMemo(
    () => filteredVoiceGroups.reduce((acc, g) => acc + g.voices.length, 0),
    [filteredVoiceGroups],
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

  const previewGenderLabel =
    filteredGender === "male" ? "мужской" : filteredGender === "female" ? "женский" : "авто";

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`${
          compact ? "w-8 h-8" : "w-8 h-8"
        } flex items-center justify-center rounded text-[#7d838a] hover:bg-[#f2f4f7] hover:text-[#0d6e68] transition-colors`}
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

          {/* Внешний вид — превью текущей/наводимой модели */}
          <Section icon={<UserCircle2 className="w-3.5 h-3.5" />} title="Внешний вид">
            <ModelPreview
              model={previewModel ?? activeModel}
              isPreview={Boolean(previewModel)}
            />
            <div className="mt-2 space-y-1">
              {PERSONALIZATION_GLB_CATALOG.map((m) => {
                const isActive = currentModelPath === m.path;
                const isPreviewing = previewModel?.id === m.id;
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
                      className={`w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-base shrink-0 border ${
                        m.gender === "male"
                          ? "from-blue-100 to-blue-50 border-blue-200/60"
                          : "from-pink-100 to-pink-50 border-pink-200/60"
                      }`}
                      aria-hidden
                    >
                      {m.gender === "male" ? "🧑" : "👩"}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold text-gray-800 truncate">
                        {m.label}
                      </span>
                      <span className="block text-[10px] text-gray-500">
                        {m.gender === "male" ? "Мужской персонаж" : "Женский персонаж"}
                      </span>
                    </span>
                    {isActive && <Check className="w-3.5 h-3.5 text-sber-green shrink-0" />}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Голос — фильтр по полу модели + превью ▶ */}
          <Section
            icon={<Mic className="w-3.5 h-3.5" />}
            title={`Голос (${previewGenderLabel})`}
          >
            {voiceGroups.length === 0 ? (
              <p className="text-[10px] text-gray-400 px-1 py-1">
                Список голосов ещё не загружен — попробуйте чуть позже.
              </p>
            ) : totalVoicesForGender === 0 ? (
              <p className="text-[10px] text-gray-400 px-1 py-1">
                Нет голосов для {previewGenderLabel} пола — попробуйте другого
                персонажа.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredVoiceGroups.map((group) => (
                  <div key={group.id}>
                    <div className="text-[9px] uppercase font-bold tracking-wider text-gray-400 mb-1">
                      {group.label}
                    </div>
                    <div className="space-y-1">
                      {group.voices.map((v) => {
                        const isActive =
                          voiceId === v.id ||
                          (voiceOverride === v.id && voiceId !== null);
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
                              title={isActive ? "Активный голос" : "Выбрать голос"}
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
                              {isActive && (
                                <Check className="w-3.5 h-3.5 text-sber-green shrink-0" />
                              )}
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

function ModelPreview({
  model,
  isPreview,
}: {
  model: ModelEntry | undefined;
  isPreview: boolean;
}) {
  if (!model) return null;
  const isMale = model.gender === "male";
  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${
        isPreview
          ? isMale
            ? "border-blue-300/70 bg-gradient-to-br from-blue-50 to-white"
            : "border-pink-300/70 bg-gradient-to-br from-pink-50 to-white"
          : "border-gray-200 bg-gradient-to-br from-slate-50 to-white"
      }`}
    >
      <div className="flex items-center gap-3 p-2.5">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 border ${
            isMale
              ? "bg-blue-100/80 border-blue-200/60"
              : "bg-pink-100/80 border-pink-200/60"
          }`}
          aria-hidden
        >
          {isMale ? "🧑" : "👩"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[12.5px] font-bold text-gray-800 truncate">
              {model.label}
            </span>
            {isPreview && (
              <span className="text-[9px] uppercase font-bold tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                превью
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500">
            Пол: {isMale ? "мужской" : "женский"} · Голос: автоподбор
          </div>
        </div>
      </div>
    </div>
  );
}
