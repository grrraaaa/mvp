"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Info, Play, Square } from "lucide-react";
import { previewVoiceSample, type PreviewHandle } from "@/lib/tts/previewVoice";
import {
  allAssistantVoices,
  voiceForGender,
  voicesForGender,
  type CharacterGender,
} from "@/lib/tts/assistantVoices";
import { useTtsStore } from "@/store/ttsStore";
import { useCharacterStore } from "@/store/characterStore";

interface Props {
  characterGender: CharacterGender;
  compact?: boolean;
}

/** Выбор «Голос 1» / «Голос 2» для текущего пола персонажа. */
export function VoicePicker({ characterGender, compact }: Props) {
  const voiceGroups = useTtsStore((s) => s.voiceGroups);
  const voiceId = useTtsStore((s) => s.voiceId);
  const setVoiceId = useTtsStore((s) => s.setVoiceId);
  const setVoiceOverride = useCharacterStore((s) => s.setVoiceOverride);
  // Флаги доступности провайдеров с бэка: скрывать/показывать баннер "API key required"
  const googleAvailable = useTtsStore((s) => s.googleAvailable);
  const qwenAvailable = useTtsStore((s) => s.qwenAvailable);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const previewRef = useRef<PreviewHandle | null>(null);

  // Показываем баннер только если реально что-то недоступно. Edge — всегда бесплатный,
  // не упоминаем. Бэк уже фильтрует каталог, так что юзер не увидит фантомных голосов —
  // баннер просто объясняет ПОЧЕМУ их нет.
  const missingProviders: string[] = [];
  if (!googleAvailable) missingProviders.push("Google TTS");
  if (!qwenAvailable) missingProviders.push("Qwen TTS");

  const genderVoices = useMemo(
    () => voicesForGender(voiceGroups, characterGender),
    [voiceGroups, characterGender],
  );

  const activeVoice = useMemo(() => {
    const picked = allAssistantVoices(voiceGroups).find((v) => v.id === voiceId);
    if (picked?.gender === characterGender) return picked;
    return voiceForGender(voiceGroups, characterGender);
  }, [voiceGroups, voiceId, characterGender]);

  const handleSelect = (id: string) => {
    setVoiceId(id);
    setVoiceOverride(id);
  };

  const handleTogglePlay = (id: string) => {
    if (playingVoiceId === id) {
      previewRef.current?.stop();
      previewRef.current = null;
      setPlayingVoiceId(null);
      return;
    }
    previewRef.current?.stop();
    previewRef.current = previewVoiceSample(id);
    setPlayingVoiceId(id);
    void previewRef.current.done.finally(() => {
      setPlayingVoiceId((cur) => (cur === id ? null : cur));
    });
  };

  if (!genderVoices.length) {
    return <p className="text-[10px] text-gray-400 px-1 py-1">Голоса загружаются…</p>;
  }

  return (
    <div className="space-y-1">
      {missingProviders.length > 0 && (
        <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10.5px] text-amber-900 leading-snug">
          <div className="flex items-center gap-1.5 font-semibold mb-0.5">
            <Info className="w-3.5 h-3.5 shrink-0" aria-hidden />
            <span>Голоса ограничены</span>
          </div>
          <p>
            Не настроено: <b>{missingProviders.join(", ")}</b>. Добавьте
            соответствующий API-ключ в <code className="px-1 bg-amber-100/70 rounded">.env</code>{" "}
            (например, <code className="px-1 bg-amber-100/70 rounded">GOOGLE_TTS_API_KEY</code>),
            и они появятся в каталоге.
          </p>
        </div>
      )}
      {genderVoices.map((v) => {
        const isActive = activeVoice?.id === v.id;
        const isPlaying = playingVoiceId === v.id;
        return (
          <div
            key={v.id}
            className={`flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg transition-colors ${
              isActive ? "bg-emerald-50/60 ring-1 ring-sber-green/30" : "hover:bg-gray-50"
            } ${isPlaying ? "bg-amber-50 ring-amber-200" : ""}`}
          >
            <button
              type="button"
              onClick={() => handleSelect(v.id)}
              className="flex-1 min-w-0 text-left"
            >
              <div className={`font-semibold text-gray-800 truncate ${compact ? "text-[11px]" : "text-xs"}`}>
                {v.short ?? v.name}
              </div>
              <div className="text-[10px] text-gray-500">
                {characterGender === "male" ? "Мужской" : "Женский"}
                {v.description ? ` · ${v.description.replace(/^(Мужской|Женский)\s*·\s*/i, "")}` : ""}
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleTogglePlay(v.id)}
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
            {isActive && <Check className="w-3.5 h-3.5 text-sber-green shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}
