"use client";

import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api/baseUrl";
import { authHeaders } from "@/lib/auth/tokenRef";
import type { ActionButton } from "@/store/assistantStore";

interface Props {
  buttons: ActionButton[];
  onSendMessage?: (text: string) => void;
  compact?: boolean;
}

export function ActionButtons({ buttons, onSendMessage, compact }: Props) {
  const router = useRouter();

  return (
    <div className={`mt-1.5 flex flex-col gap-1.5 ${compact ? "ml-0" : "ml-10 mt-2 gap-2"}`}>
      {buttons.map((btn, i) => {
        const className = `inline-flex items-center gap-1.5 rounded-xl font-medium transition-all w-fit ${
          compact ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm"
        } ${
          btn.variant === "primary"
            ? "sber-btn-primary shadow-lg shadow-sber-green/20"
            : "sber-btn-ghost"
        }`;

        if (btn.message && onSendMessage) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSendMessage(btn.message!)}
              className={className}
            >
              {btn.label}
            </button>
          );
        }

        if (!btn.url) return null;

        if (btn.url.startsWith("/api/")) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                void fetch(apiUrl(btn.url!), {
                  credentials: "same-origin",
                  headers: authHeaders(),
                })
                  .then((res) => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.blob();
                  })
                  .then((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "statement.pdf";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  })
                  .catch(() => undefined);
              }}
              className={className}
            >
              {btn.label}
            </button>
          );
        }

        if (btn.url.startsWith("/")) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => router.push(btn.url!)}
              className={className}
            >
              {btn.label}
            </button>
          );
        }

        return (
          <a
            key={i}
            href={btn.url}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            {btn.variant === "primary" && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            )}
            {btn.label}
          </a>
        );
      })}
    </div>
  );
}
