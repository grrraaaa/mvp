"use client";

import { useState } from "react";
import { Info, Check } from "lucide-react";

export interface ChoiceCardOption {
  /** Уникальный id варианта (например, "6m", "12m", "pdf-esign"). */
  id: string;
  /** Заголовок — основная строка (например, "За 12 месяцев"). */
  label: string;
  /** Подпись под заголовком (например, "PDF с электронной подписью"). */
  description?: string;
  /** Крупная акцентная строка (например, "531 200,00 BYN"). */
  value?: string;
  /** Помечается как рекомендованный — будет выделен рамкой и плашкой. */
  recommended?: boolean;
  /** Что отправить ассистенту при клике (или вернуть через onPick). */
  message: string;
}

export interface ChoiceCard {
  /** Подсказка-инфо над списком (например, про PDF с ЭЦП). */
  hint?: string;
  /** Заголовок секции, опционально. */
  title?: string;
  /** Список опций. */
  options: ChoiceCardOption[];
  /** Один-единственный выбор (radio) или мульти-выбор (checkbox). */
  multi?: boolean;
  /** Текст кнопки подтверждения. */
  submitLabel?: string;
  /** Сообщение, которое отправится при подтверждении (если пусто — будет собрано из выбранных). */
  submitMessage?: string;
}

interface Props {
  cards: ChoiceCard[];
  compact?: boolean;
  onPick: (text: string) => void;
}

/**
 * Карточки выбора с радиокнопками и плашкой «Рекомендуем» — структурированный
 * ответ ассистента в стиле web mobile Copilot: hint сверху, опции с кружочком,
 * recommended выделен рамкой и зелёной плашкой, CTA-кнопка отправляет выбор.
 */
export function ChoiceCards({ cards, compact, onPick }: Props) {
  return (
    <div className="mt-2 space-y-3">
      {cards.map((card, ci) => (
        <ChoiceCardItem
          key={ci}
          card={card}
          compact={compact}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

function ChoiceCardItem({
  card,
  compact,
  onPick,
}: {
  card: ChoiceCard;
  compact?: boolean;
  onPick: (text: string) => void;
}) {
  const recommended = card.options.find((o) => o.recommended);
  const [selected, setSelected] = useState<string | null>(
    recommended?.id ?? card.options[0]?.id ?? null,
  );

  const handleSelect = (id: string) => {
    if (card.multi) {
      setSelected((prev) => (prev === id ? null : id));
    } else {
      setSelected(id);
    }
  };

  const handleSubmit = () => {
    const chosen = card.options.find((o) => o.id === selected);
    if (!chosen) return;
    const text = card.submitMessage ?? chosen.message;
    onPick(text);
  };

  return (
    <div
      className={`rounded-xl border border-[#e4e8eb] bg-white ${
        compact ? "p-2" : "p-2.5"
      }`}
    >
      {card.hint && (
        <div className="flex items-start gap-1.5 mb-2 text-[11px] text-[#5a6470] leading-snug">
          <Info className="w-3.5 h-3.5 mt-0.5 text-[#0d6e68] shrink-0" />
          <span>{card.hint}</span>
        </div>
      )}
      <div className="space-y-1.5">
        {card.options.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={`relative w-full text-left flex items-start gap-2 rounded-lg border px-2.5 py-2 transition-all ${
                isSelected
                  ? opt.recommended
                    ? "border-[#0a8064] bg-[#f0faf6]"
                    : "border-[#0a8064]/60 bg-[#f6fbfa]"
                  : "border-[#e4e8eb] bg-white hover:border-[#0a8064]/40"
              }`}
            >
              <span
                className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected
                    ? "border-[#0a8064]"
                    : "border-[#cbd5e1]"
                }`}
                aria-hidden
              >
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0a8064]" />
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[12.5px] font-semibold text-[#1f1f22] leading-snug">
                    {opt.label}
                  </span>
                  {opt.recommended && (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider bg-[#0a8064] text-white px-1.5 py-0.5 rounded">
                      Рекомендуем
                    </span>
                  )}
                </span>
                {opt.description && (
                  <span className="block text-[10.5px] text-[#7d838a] leading-snug mt-0.5">
                    {opt.description}
                  </span>
                )}
              </span>
              {opt.value && (
                <span className="ml-1 text-[12.5px] font-bold text-[#0a8064] whitespace-nowrap shrink-0 self-center">
                  {opt.value}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {card.submitLabel && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selected}
          className={`mt-2 w-full bg-[#0a8064] hover:bg-[#086652] text-white font-semibold ${
            compact ? "py-1.5 text-xs" : "py-2 text-sm"
          } rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5`}
        >
          <Check className="w-3.5 h-3.5" />
          {card.submitLabel}
        </button>
      )}
    </div>
  );
}
