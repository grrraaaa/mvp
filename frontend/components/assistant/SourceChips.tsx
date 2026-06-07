"use client";

import type { SourceRef } from "@/store/assistantStore";

interface Props {
  sources: SourceRef[];
  onShowSource?: (source: SourceRef) => void;
  compact?: boolean;
}

export function SourceChips({ sources, onShowSource, compact }: Props) {
  if (!sources.length) return null;

  return (
    <div
      className={`flex gap-1.5 mt-1.5 overflow-x-auto pb-0.5 flex-wrap ${compact ? "ml-0" : "ml-10"}`}
    >
      {sources.map((src) => {
        const inner = (
          <span className="truncate max-w-[200px]">{src.label}</span>
        );
        const className = compact
          ? "text-[10px] px-2 py-0.5 rounded-full border border-[#d0d7dd] text-[#107f8c] hover:bg-[#e5fcf7] transition-colors whitespace-nowrap"
          : "text-xs px-2.5 py-1 rounded-full border border-sber-border text-sber-green-light hover:bg-sber-green/10 transition-colors whitespace-nowrap";

        if (src.url?.startsWith("/")) {
          return (
            <button
              key={src.index}
              type="button"
              className={className}
              title={src.label}
              onClick={() => onShowSource?.(src)}
            >
              {inner}
            </button>
          );
        }
        const isExternal = Boolean(src.url && /^https?:\/\//i.test(src.url));
        return (
          <button
            key={src.index}
            type="button"
            className={className}
            title={src.label}
            onClick={() => {
              if (isExternal && src.url) {
                window.open(src.url, "_blank", "noopener,noreferrer");
                return;
              }
              onShowSource?.(src);
            }}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
