"use client";

interface Props {
  mode: "thinking" | "voice";
  compact?: boolean;
}

/** Анимация ожидания: ответ с сервера или подготовка озвучки. */
export function AssistantPendingIndicator({ mode, compact }: Props) {
  const label = mode === "voice" ? "Готовлю озвучку" : "Думаю";

  return (
    <div className="flex flex-col gap-2 py-0.5" aria-live="polite" aria-busy="true">
      <div className="flex items-end gap-1 h-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`w-1 rounded-full bg-[#108c7c] origin-bottom animate-assistant-wave ${
              compact ? "h-3" : "h-4"
            }`}
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
      <span
        className={`text-[#6d7a84] font-medium ${
          compact ? "text-[10px]" : "text-[11px]"
        }`}
      >
        {label}
        <span className="inline-flex w-[1.1em] animate-assistant-ellipsis" aria-hidden>
          …
        </span>
      </span>
    </div>
  );
}
