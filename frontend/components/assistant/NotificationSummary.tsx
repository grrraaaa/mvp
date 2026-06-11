"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import type { SmartNotification } from "@/lib/api/banking";

interface Props {
  notifications: SmartNotification[];
  compact?: boolean;
  onAsk?: (notification: SmartNotification) => void;
}

const SEVERITY_STYLES: Record<string, string> = {
  info: "border-emerald-200 bg-emerald-50",
  warn: "border-amber-300 bg-amber-50",
  critical: "border-red-300 bg-red-50",
};

const SEVERITY_TITLE: Record<string, string> = {
  info: "text-emerald-800",
  warn: "text-amber-900",
  critical: "text-red-900",
};

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-emerald-500",
  warn: "bg-amber-500",
  critical: "bg-red-500",
};

/**
 * Компактная сводка уведомлений: по умолчанию одна строка «N напоминаний»,
 * по клику — раскрывается полный список карточек. Чтобы не вытеснять
 * welcome-экран чата, когда напоминаний много.
 */
export function NotificationSummary({ notifications, compact, onAsk }: Props) {
  const [open, setOpen] = useState(false);
  if (!notifications.length) return null;

  const total = notifications.length;
  const important = notifications.filter(
    (n) => n.severity === "warn" || n.severity === "critical",
  ).length;
  const subtitle =
    important > 0
      ? `${total} напоминаний · ${important} требуют внимания`
      : `${total} ${pluralRu(total, ["напоминание", "напоминания", "напоминаний"])}`;

  return (
    <div
      className={`text-left w-full max-w-md mx-auto ${compact ? "mb-2" : "mb-4"}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="notification-summary-list"
        className={`group w-full flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-50 transition-colors text-left ${
          compact ? "px-3 py-2" : "px-3.5 py-2.5"
        }`}
      >
        <div className="shrink-0 rounded-full bg-white/90 p-1.5 text-amber-700">
          <Bell className="w-4 h-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-amber-900 leading-tight">
            {subtitle}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 group-hover:text-amber-900 shrink-0">
          {open ? "Скрыть" : "Показать"}
          {open ? (
            <ChevronUp className="w-3.5 h-3.5" aria-hidden />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" aria-hidden />
          )}
        </span>
      </button>

      {open && (
        <div
          id="notification-summary-list"
          role="region"
          aria-label="Список напоминаний"
          className={`mt-2 max-h-72 overflow-y-auto pr-1 space-y-2 ${compact ? "" : "space-y-2.5"}`}
        >
          {notifications.map((n) => {
            const boxStyle = SEVERITY_STYLES[n.severity] ?? SEVERITY_STYLES.info;
            const titleStyle = SEVERITY_TITLE[n.severity] ?? SEVERITY_TITLE.info;
            const dotStyle = SEVERITY_DOT[n.severity] ?? SEVERITY_DOT.info;
            return (
              <div
                key={n.id}
                role="listitem"
                className={`rounded-xl border text-left shadow-sm ${boxStyle} ${
                  compact ? "px-3 py-2.5" : "px-3.5 py-3"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotStyle}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold text-[13px] leading-snug ${titleStyle}`}>
                      {n.title}
                    </div>
                    <p className="text-[12.5px] text-gray-700 mt-0.5 leading-snug">
                      {n.body}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      {n.action_url && n.action_label && (
                        <Link
                          href={n.action_url}
                          className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold text-sky-700 hover:text-sky-900 hover:underline"
                        >
                          {n.action_label}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      {onAsk && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAsk(n);
                          }}
                          className="text-[12.5px] font-semibold text-[#107f8c] hover:underline"
                        >
                          Спросить у консультанта
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function pluralRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
