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
  const top = notifications[0];
  const boxStyle = SEVERITY_STYLES[top.severity] ?? SEVERITY_STYLES.info;
  const titleStyle = SEVERITY_TITLE[top.severity] ?? SEVERITY_TITLE.info;

  return (
    <div
      className={`rounded-xl border text-left shadow-sm ${boxStyle} ${
        compact ? "px-3.5 py-3" : "px-4 py-3.5"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 rounded-full p-1.5 bg-white/80 ${titleStyle}`}>
          <Bell className="w-4 h-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`font-semibold text-sm leading-snug ${titleStyle}`}>{top.title}</div>
          <p className="text-sm text-gray-700 mt-1 leading-relaxed">{top.body}</p>
          {top.action_url && top.action_label && (
            <Link
              href={top.action_url}
              className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-sky-700 hover:text-sky-900 hover:underline"
            >
              {top.action_label}
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
          {notifications.length > 1 && (
            <p className="mt-2 text-xs font-medium text-gray-500">
              + ещё {notifications.length - 1} напоминаний
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
