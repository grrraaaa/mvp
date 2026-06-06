"use client";

import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import type { SmartNotification } from "@/lib/api/banking";

interface Props {
  notifications: SmartNotification[];
  compact?: boolean;
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

export function NotificationBanner({ notifications, compact }: Props) {
  if (!notifications.length) return null;

  return (
    <div className={`space-y-2 ${compact ? "" : "space-y-3"}`} role="list" aria-label="Напоминания">
      {notifications.map((n) => {
        const boxStyle = SEVERITY_STYLES[n.severity] ?? SEVERITY_STYLES.info;
        const titleStyle = SEVERITY_TITLE[n.severity] ?? SEVERITY_TITLE.info;

        return (
          <div
            key={n.id}
            role="listitem"
            className={`rounded-xl border text-left shadow-sm ${boxStyle} ${
              compact ? "px-3.5 py-3" : "px-4 py-3.5"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 shrink-0 rounded-full p-1.5 bg-white/80 ${titleStyle}`}>
                <Bell className="w-4 h-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`font-semibold text-sm leading-snug ${titleStyle}`}>{n.title}</div>
                <p className="text-sm text-gray-700 mt-1 leading-relaxed">{n.body}</p>
                {n.action_url && n.action_label && (
                  <Link
                    href={n.action_url}
                    className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-sky-700 hover:text-sky-900 hover:underline"
                  >
                    {n.action_label}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
