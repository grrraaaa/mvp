"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import type { SmartNotification } from "@/lib/api/banking";

interface Props {
  notifications: SmartNotification[];
  compact?: boolean;
  onAsk?: (notification: SmartNotification) => void;
}

const SEVERITY_BOX: Record<string, string> = {
  info: "border-emerald-200 bg-emerald-50",
  warn: "border-amber-300 bg-amber-50",
  critical: "border-red-300 bg-red-50",
};

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-emerald-500",
  warn: "bg-amber-500",
  critical: "bg-red-500",
};

const SEVERITY_TITLE: Record<string, string> = {
  info: "text-emerald-800",
  warn: "text-amber-900",
  critical: "text-red-900",
};

interface Group {
  title: string;
  severity: string;
  items: SmartNotification[];
  important: number;
}

function groupByTitle(items: SmartNotification[]): Group[] {
  const map = new Map<string, SmartNotification[]>();
  for (const n of items) {
    const key = n.title || "Уведомления";
    const list = map.get(key) ?? [];
    list.push(n);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([title, list]) => {
    const important = list.filter(
      (n) => n.severity === "warn" || n.severity === "critical",
    ).length;
    const severity =
      list.find((n) => n.severity === "critical")?.severity ??
      list.find((n) => n.severity === "warn")?.severity ??
      list[0]?.severity ??
      "info";
    return { title, items: list, important, severity };
  });
}

function pluralRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

/**
 * Компактная сводка уведомлений: группируем по title (например, все
 * «Документ на подписи» склеиваются в одну строку «5 документов на подписи»).
 * По умолчанию видно сводную плашку + первые 3 группы (одной строкой каждая);
 * по клику на группу — раскрывается компактный список уведомлений внутри.
 */
export function NotificationSummary({ notifications, compact, onAsk }: Props) {
  const [allOpen, setAllOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(() => groupByTitle(notifications), [notifications]);
  const total = notifications.length;
  const importantTotal = groups.reduce((acc, g) => acc + g.important, 0);

  if (!total) return null;

  const subtitle =
    importantTotal > 0
      ? `${total} ${pluralRu(total, ["напоминание", "напоминания", "напоминаний"])} · ${importantTotal} ${pluralRu(importantTotal, ["важное", "важных", "важных"])}`
      : `${total} ${pluralRu(total, ["напоминание", "напоминания", "напоминаний"])}`;

  const visibleGroups = allOpen ? groups : groups.slice(0, 3);
  const hiddenGroups = Math.max(0, groups.length - 3);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <div
      className={`text-left w-full max-w-md mx-auto ${compact ? "mb-2" : "mb-4"}`}
    >
      {/* Сводная плашка */}
      <div
        className={`w-full flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 ${
          compact ? "px-3 py-2" : "px-3.5 py-2.5"
        }`}
      >
        <div className="shrink-0 rounded-full bg-white/90 p-1.5 text-amber-700">
          <Bell className="w-4 h-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 text-sm font-semibold text-amber-900 leading-tight">
          {subtitle}
        </div>
        {hiddenGroups > 0 && !allOpen && (
          <button
            type="button"
            onClick={() => setAllOpen(true)}
            className="text-xs font-semibold text-amber-800 hover:text-amber-900 shrink-0 inline-flex items-center gap-1"
          >
            Все {groups.length}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}
        {allOpen && (
          <button
            type="button"
            onClick={() => setAllOpen(false)}
            className="text-xs font-semibold text-amber-800 hover:text-amber-900 shrink-0 inline-flex items-center gap-1"
          >
            Свернуть
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Список групп */}
      <ul className={`mt-2 space-y-1.5 ${compact ? "" : ""}`}>
        {visibleGroups.map((g) => {
          const isOpen = openGroups.has(g.title);
          const boxStyle = SEVERITY_BOX[g.severity] ?? SEVERITY_BOX.info;
          const dotStyle = SEVERITY_DOT[g.severity] ?? SEVERITY_DOT.info;
          const titleStyle = SEVERITY_TITLE[g.severity] ?? SEVERITY_TITLE.info;
          const visibleItems = isOpen ? g.items : g.items.slice(0, 2);
          const hiddenInGroup = g.items.length - visibleItems.length;
          return (
            <li
              key={g.title}
              className={`rounded-lg border ${boxStyle} overflow-hidden`}
            >
              <button
                type="button"
                onClick={() => toggleGroup(g.title)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-white/40 transition-colors"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyle}`}
                  aria-hidden
                />
                <span
                  className={`text-[12.5px] font-semibold truncate flex-1 ${titleStyle}`}
                >
                  {g.title}
                  <span className="ml-1.5 text-[11.5px] font-bold opacity-80">
                    · {g.items.length}
                  </span>
                </span>
                {g.important > 0 && (
                  <span className="text-[10.5px] font-bold uppercase tracking-wide text-red-700 shrink-0">
                    {g.important} !
                  </span>
                )}
                {isOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                )}
              </button>

              {isOpen && (
                <ul className="border-t border-white/60 bg-white/50 divide-y divide-gray-100">
                  {visibleItems.map((n) => (
                    <li
                      key={n.id}
                      className="px-2.5 py-1.5 flex items-center gap-2 text-[12px] text-gray-700"
                    >
                      <span
                        className={`w-1 h-1 rounded-full shrink-0 ${dotStyle}`}
                        aria-hidden
                      />
                      <span className="truncate flex-1" title={n.body}>
                        {n.body}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {n.action_url && n.action_label && (
                          <Link
                            href={n.action_url}
                            className="text-[11.5px] font-semibold text-sky-700 hover:text-sky-900 hover:underline"
                          >
                            {n.action_label}
                          </Link>
                        )}
                        {onAsk && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAsk(n);
                            }}
                            className="text-[11.5px] font-semibold text-[#107f8c] hover:underline"
                          >
                            Спросить
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                  {hiddenInGroup > 0 && (
                    <li className="px-2.5 py-1 text-[11px] text-gray-500 italic">
                      ещё {hiddenInGroup}…
                    </li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
