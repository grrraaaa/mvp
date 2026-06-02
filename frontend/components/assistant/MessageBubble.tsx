"use client";

import Link from "next/link";
import type { ChatMessage } from "@/store/assistantStore";
import {
  normalizeAssistantLinks,
  sanitizeSbbolUrl,
} from "@/lib/sbbol/sbbolLinks";

interface Props {
  message: ChatMessage;
  isTyping?: boolean;
  compact?: boolean;
}

const LINK_RE = /((?:https:\/\/sbbol\.bps-sberbank\.by[^\s<]*)|(?:\/[\w\-/]+))/g;

function renderTextWithLinks(text: string) {
  const normalized = normalizeAssistantLinks(text);
  const parts = normalized.split(LINK_RE);

  return parts.map((part, i) => {
    if (part.startsWith("/")) {
      const href = sanitizeSbbolUrl(part);
      return (
        <Link key={i} href={href} className="sber-link break-all">
          {href}
        </Link>
      );
    }
    if (part.startsWith("https://")) {
      const href = sanitizeSbbolUrl(part);
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="sber-link break-all"
        >
          {href}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function MessageBubble({ message, isTyping, compact }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-1`}>
      {!isUser && (
        <div
          className={`rounded-full mr-1.5 mt-0.5 flex-shrink-0 flex items-center justify-center bg-sber-green/20 border border-sber-border ${
            compact ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-sm"
          }`}
          aria-hidden
        >
          С
        </div>
      )}
      <div
        className={`leading-relaxed ${
          compact ? "max-w-[90%] px-2.5 py-1.5 text-xs" : "max-w-[85%] px-4 py-2.5 text-sm"
        } ${isUser ? "sber-bubble-user" : "sber-bubble-assistant"}`}
      >
        {isTyping ? (
          <span className="flex gap-1 py-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 bg-sber-green-light rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        ) : (
          renderTextWithLinks(message.content)
        )}
      </div>
    </div>
  );
}
