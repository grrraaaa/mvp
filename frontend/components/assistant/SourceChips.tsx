"use client";

import type { SourceRef } from "@/store/assistantStore";

interface Props {
  sources: SourceRef[];
  onShowSource?: (source: SourceRef) => void;
  compact?: boolean;
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function SourceChips({ sources, onShowSource, compact }: Props) {
  if (!sources.length) return null;

  const className = compact
    ? "text-[10px] px-2 py-0.5 rounded-full border border-[#d0d7dd] text-[#107f8c] hover:bg-[#e5fcf7] transition-colors whitespace-nowrap inline-flex items-center max-w-[220px]"
    : "text-xs px-2.5 py-1 rounded-full border border-sber-border text-sber-green-light hover:bg-sber-green/10 transition-colors whitespace-nowrap inline-flex items-center max-w-[240px]";

  return (
    <div
      className={`flex gap-1.5 mt-1.5 overflow-x-auto pb-0.5 flex-wrap ${compact ? "ml-0" : "ml-10"}`}
    >
      {sources.map((src) => {
        const inner = <span className="truncate">{src.label}</span>;
        const url = src.url ?? "";

        if (isExternalUrl(url)) {
          return (
            <a
              key={src.index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
              title={src.label}
            >
              {inner}
            </a>
          );
        }

        if (url.startsWith("/")) {
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

        return (
          <button
            key={src.index}
            type="button"
            className={className}
            title={src.label}
            onClick={() => onShowSource?.(src)}
            disabled={!src.url && !onShowSource}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
