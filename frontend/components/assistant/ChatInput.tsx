"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useWebSpeechInput } from "@/hooks/useWebSpeechInput";

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
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onSuggestionSelect,
  onPhotoSelect,
  showPhotoButton = false,
  disabled,
  suggestions = [],
  compact = false,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    supported,
    isListening,
    status,
    statusKind,
    toggleListening,
    stopListening,
    clearStatus,
  } = useWebSpeechInput(onChange);

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

  const btnSize = compact ? "w-9 h-9" : "w-11 h-11";
  const iconSize = compact ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className={compact ? "p-2 space-y-1.5" : "p-4 space-y-3"}>
      {!value && suggestions.length > 0 && (
        <div className={compact ? "space-y-1" : undefined}>
          {compact && (
            <button
              type="button"
              onClick={() => setShowSuggestions((v) => !v)}
              className="text-[10px] text-[#7d838a] px-0.5"
            >
              {showSuggestions ? "Скрыть подсказки" : "Показать подсказки"}
            </button>
          )}
          {(showSuggestions || !compact) && (
            <div
              className={`flex gap-1.5 ${compact ? "overflow-x-auto pb-0.5 flex-nowrap scrollbar-thin" : "flex-wrap gap-2"}`}
            >
              {suggestions.map((s, i) => (
                <button
                  key={`suggestion-${i}`}
                  type="button"
                  onClick={() => (onSuggestionSelect ? onSuggestionSelect(s) : onChange(s))}
                  className={`rounded-full sber-btn-ghost transition-colors whitespace-nowrap flex-shrink-0 ${
                    compact ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1.5"
                  }`}
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
                ? "text-[#21A038]"
                : "text-gray-500"
          }`}
          role="status"
        >
          {status}
        </p>
      )}

      {showPhotoButton && onPhotoSelect && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
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
            className={`${btnSize} rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-[#107f8c] hover:text-[#107f8c] flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40`}
            aria-label="Заполнить с фото"
            title="Сфотографировать или загрузить платёжку"
          >
            <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        )}

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={compact ? "Спросите…" : "Спросите об услугах Сбера..."}
          disabled={disabled}
          rows={1}
          className={`flex-1 sber-input resize-none disabled:opacity-50 ${
            compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"
          }`}
          style={{ minHeight: compact ? "36px" : "44px", maxHeight: compact ? "88px" : "120px" }}
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
            className={`${btnSize} rounded-xl border flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isListening
                ? "border-[#21A038] bg-[#21A038]/15 text-[#21A038] animate-pulse"
                : "border-gray-200 bg-white text-gray-600 hover:border-[#21A038] hover:text-[#21A038]"
            }`}
            aria-label={isListening ? "Остановить запись" : "Голосовой ввод"}
            aria-pressed={isListening}
            title={isListening ? "Остановить запись" : "Голосовой ввод"}
          >
            <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3zm0 0v3m-4 0h8m-4-8a7 7 0 017 7v1H5v-1a7 7 0 017-7z"
              />
            </svg>
          </button>
        ) : (
          <div className={`${btnSize} flex-shrink-0`} aria-hidden />
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className={`${btnSize} rounded-xl sber-btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0`}
          aria-label="Отправить"
        >
          <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
