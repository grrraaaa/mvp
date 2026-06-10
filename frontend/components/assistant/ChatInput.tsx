"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { Paperclip, Mic, Send, StopCircle, BarChart3 } from "lucide-react";
import { useWebSpeechInput } from "@/hooks/useWebSpeechInput";

interface ChartQuickPreset {
  label: string;
  icon: string;
  hint: string;
  message: string;
}

const CHART_QUICK_PRESETS: ChartQuickPreset[] = [
  { label: "Остаток на счёте", icon: "💰", hint: "График по счетам организации", message: "Сколько на счёте?" },
  { label: "Кассовый прогноз", icon: "📈", hint: "Прогноз остатка на 30 дней", message: "кассовый прогноз" },
  { label: "Расходы за месяц", icon: "📊", hint: "Диаграмма расходов за период", message: "расходы за 2026-05" },
  { label: "Сравнить месяцы", icon: "⚖️", hint: "Сравнение февраль и март", message: "сравни февраль и март" },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onSuggestionSelect?: (text: string) => void;
  onPhotoSelect?: (file: File) => void;
  showPhotoButton?: boolean;
  disabled?: boolean;
  compact?: boolean;
  suggestions?: string[];
  hideSuggestions?: boolean;
  highlightVoice?: boolean;
  highlightCamera?: boolean;
  onVoiceComplete?: (text: string) => void;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onSuggestionSelect,
  onPhotoSelect,
  showPhotoButton = true,
  disabled,
  suggestions = [],
  compact = false,
  hideSuggestions = false,
  highlightVoice = false,
  highlightCamera = false,
  onVoiceComplete,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showChartMenu, setShowChartMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chartBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showChartMenu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-chart-menu]") && !t.closest("[data-chart-trigger]")) {
        setShowChartMenu(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showChartMenu]);

  const {
    supported,
    isListening,
    status,
    statusKind,
    toggleListening,
    stopListening,
    clearStatus,
  } = useWebSpeechInput(onChange, {
    onComplete: onVoiceComplete,
    disabled,
  });

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    stopListening();
    clearStatus();
    onSend();
  };

  const handleMicClick = () => {
    if (!supported || disabled) return;
    toggleListening(value);
  };

  const handlePhotoClick = () => {
    if (disabled || !onPhotoSelect) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onPhotoSelect) onPhotoSelect(file);
    e.target.value = "";
  };

  const handleChartPreset = (preset: ChartQuickPreset) => {
    setShowChartMenu(false);
    if (onSuggestionSelect) {
      onSuggestionSelect(preset.message);
    } else {
      onChange(preset.message);
    }
  };

  const btnSize = compact ? "w-10 h-10 sm:w-11 sm:h-11" : "w-11 h-11 sm:w-12 sm:h-12";
  const iconSize = compact ? "w-[18px] h-[18px]" : "w-5 h-5";

  // Send button: круглая, ярко-зелёная — как в web mobile Copilot.
  const sendBtnClass = `${btnSize} rounded-full bg-[#008064] hover:bg-[#006c54] disabled:bg-[#cfd4d9] disabled:cursor-not-allowed text-white flex items-center justify-center flex-shrink-0 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008064]/40`;

  return (
    <div className={compact ? "p-2 space-y-1.5" : "p-3 sm:p-4 space-y-2.5"}>
      {!hideSuggestions && !value && suggestions.length > 0 && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setShowSuggestions((v) => !v)}
            className="text-[10px] text-[#7d838a] font-medium px-0.5 hover:text-[#107f8c]"
          >
            {showSuggestions ? "Скрыть" : `Подсказки · ${suggestions.length}`}
          </button>
          {showSuggestions && (
            <div className="flex gap-1 overflow-x-auto pb-0.5 flex-nowrap max-h-6 scrollbar-thin">
              {suggestions.map((s, i) => (
                <button
                  key={`suggestion-${i}`}
                  type="button"
                  onClick={() => {
                    onSuggestionSelect ? onSuggestionSelect(s) : onChange(s);
                    setShowSuggestions(false);
                  }}
                  className="rounded-md border border-[#e4e8eb] bg-white text-[#565b62] hover:border-[#107f8c] hover:text-[#107f8c] transition-colors whitespace-nowrap flex-shrink-0 text-[9px] leading-tight px-1.5 py-0.5 max-w-[140px] truncate"
                  title={s}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {status && (
        <p
          className={`${compact ? "text-[10px]" : "text-xs"} px-1 ${
            statusKind === "error"
              ? "text-red-500"
              : statusKind === "listening"
                ? "text-[#008064] font-semibold"
                : "text-gray-500"
          }`}
          role="status"
        >
          {status}
        </p>
      )}

      {onPhotoSelect && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      <div className="flex gap-1.5 sm:gap-2 items-end">
        {showPhotoButton && onPhotoSelect && (
          <button
            type="button"
            onClick={handlePhotoClick}
            disabled={disabled}
            className={`${btnSize} rounded-full bg-[#f2f4f7] text-[#7d838a] hover:bg-[#e5fcf7] hover:text-[#008064] flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008064]/30 ${
              highlightCamera ? "bg-[#e5fcf7] text-[#008064] ring-2 ring-[#008064]/25" : ""
            }`}
            aria-label="Фото или файл"
            title="Сфотографировать или загрузить изображение"
          >
            <Paperclip className={iconSize} />
          </button>
        )}

        {/* Кнопка быстрого графика */}
        <div className="relative flex-shrink-0">
          <button
            ref={chartBtnRef}
            type="button"
            data-chart-trigger
            onClick={() => setShowChartMenu((v) => !v)}
            disabled={disabled}
            className={`${btnSize} rounded-full flex items-center justify-center transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008064]/30 ${
              showChartMenu
                ? "bg-[#e5fcf7] text-[#008064] ring-2 ring-[#008064]/25"
                : "bg-[#f2f4f7] text-[#7d838a] hover:bg-[#e5fcf7] hover:text-[#008064]"
            }`}
            aria-label="Графики и диаграммы"
            aria-expanded={showChartMenu}
            aria-haspopup="menu"
            title="Графики и диаграммы"
          >
            <BarChart3 className={iconSize} />
          </button>
          {showChartMenu && (
            <div
              data-chart-menu
              role="menu"
              className="absolute bottom-full mb-2 left-0 z-30 w-64 rounded-xl border border-[#e4e8eb] bg-white shadow-[0_8px_24px_rgba(15,31,36,0.16)] overflow-hidden animate-in fade-in slide-in-from-bottom-1"
            >
              <div className="px-3 py-2 bg-gradient-to-r from-[#e5fcf7] to-white border-b border-[#e4e8eb]">
                <p className="text-[11px] font-bold text-[#107f8c]">📊 Быстрый график</p>
                <p className="text-[10px] text-[#7d838a]">Построю по реальным данным из БД</p>
              </div>
              <div className="py-1">
                {CHART_QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    role="menuitem"
                    onClick={() => handleChartPreset(preset)}
                    className="w-full text-left px-3 py-2 hover:bg-[#f2f8f7] flex items-start gap-2.5 transition-colors"
                  >
                    <span className="text-base leading-none mt-0.5 flex-shrink-0">{preset.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold text-[#1f1f22]">{preset.label}</span>
                      <span className="block text-[10px] text-[#7d838a] leading-tight mt-0.5">{preset.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="border-t border-[#e4e8eb] px-3 py-1.5 bg-[#fafbfc]">
                <button
                  type="button"
                  onClick={() => {
                    setShowChartMenu(false);
                    onChange("Покажи график");
                  }}
                  className="text-[10px] font-semibold text-[#107f8c] hover:underline"
                >
                  Или спросите: «Покажи график» →
                </button>
              </div>
            </div>
          )}
        </div>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={compact ? "Спросите…" : "Спросите о СберБизнес: расчёты, выписка, зарплата…"}
          disabled={disabled}
          rows={1}
          className={`flex-1 bg-[#f2f4f7] border border-transparent rounded-2xl text-[#2c3e50] placeholder:text-[#9aa1a8] focus:outline-none focus:border-[#008064]/40 focus:bg-white focus:ring-2 focus:ring-[#008064]/10 resize-none disabled:opacity-50 transition-all ${
            compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"
          }`}
          style={{ minHeight: compact ? "36px" : "42px", maxHeight: compact ? "88px" : "120px" }}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = "auto";
            t.style.height = Math.min(t.scrollHeight, compact ? 88 : 120) + "px";
          }}
        />

        {mounted && supported ? (
          <button
            type="button"
            onClick={handleMicClick}
            disabled={disabled}
            className={`${btnSize} rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008064]/30 ${
              isListening
                ? "bg-[#e5fcf7] text-[#008064] ring-2 ring-[#008064]/30 animate-pulse"
                : highlightVoice
                  ? "bg-[#e5fcf7] text-[#008064] ring-2 ring-[#008064]/20"
                  : "bg-[#f2f4f7] text-[#7d838a] hover:bg-[#e5fcf7] hover:text-[#008064]"
            }`}
            aria-label={isListening ? "Остановить запись" : "Голосовой ввод"}
            aria-pressed={isListening}
            title={isListening ? "Остановить запись" : "Голосовой ввод"}
          >
            {isListening ? (
              <StopCircle className={iconSize} />
            ) : (
              <Mic className={iconSize} />
            )}
          </button>
        ) : (
          <div className={`${btnSize} flex-shrink-0`} aria-hidden />
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className={sendBtnClass}
          aria-label="Отправить"
        >
          <Send className={iconSize} />
        </button>
      </div>
    </div>
  );
}
