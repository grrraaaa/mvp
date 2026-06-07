"use client";

import type { ChatMessage } from "@/store/assistantStore";
import { AssistantChart } from "@/components/assistant/AssistantChart";
import { renderAssistantMessageContent } from "@/lib/assistant/renderMessageContent";

interface Props {
  message: ChatMessage;
  isTyping?: boolean;
  compact?: boolean;
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
          <>
            {renderAssistantMessageContent(message.content)}
            {message.charts?.map((chart, i) => (
              <AssistantChart key={i} chart={chart} compact={compact} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
