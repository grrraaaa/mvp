"use client";

import Link from "next/link";
import type { SmartNotification } from "@/lib/api/banking";

interface Props {
  notifications: SmartNotification[];
  compact?: boolean;
}

const SEVERITY_STYLES: Record<string, string> = {
  info: "border-sber-border bg-sber-green/5 text-sber-green-light",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  critical: "border-red-500/40 bg-red-500/10 text-red-200",
};

export function NotificationBanner({ notifications, compact }: Props) {
  if (!notifications.length) return null;
  const top = notifications[0];

  return (
    <div
      className={`mb-2 rounded-lg border px-3 py-2 text-left ${
        SEVERITY_STYLES[top.severity] ?? SEVERITY_STYLES.info
      } ${compact ? "text-[10px]" : "text-xs"}`}
    >
      <div className="font-medium">{top.title}</div>
      <p className="opacity-90 mt-0.5">{top.body}</p>
      {top.action_url && top.action_label && (
        <Link
          href={top.action_url}
          className="inline-block mt-1 underline underline-offset-2 hover:opacity-80"
        >
          {top.action_label}
        </Link>
      )}
      {notifications.length > 1 && (
        <p className="mt-1 opacity-70">+ ещё {notifications.length - 1} напоминаний</p>
      )}
    </div>
  );
}
