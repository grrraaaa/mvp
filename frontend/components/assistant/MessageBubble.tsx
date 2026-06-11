"use client";

import type { ChatMessage } from "@/store/assistantStore";
import { AssistantChart } from "@/components/assistant/AssistantChart";
import { ChoiceCards } from "@/components/assistant/ChoiceCards";
import { IconAiSpark } from "@/components/assistant/IconAiSpark";
import { renderAssistantMessageContent } from "@/lib/assistant/renderMessageContent";

interface Props {
  message: ChatMessage;
  isTyping?: boolean;
  compact?: boolean;
  onChoice?: (text: string) => void;
}

export function MessageBubble({ message, isTyping, compact, onChoice }: Props) {
  const isUser = message.role === "user";
  const pendingReply =
    isTyping ||
    Boolean(message.awaitingVoice) ||
    (Boolean(message.streaming) && !message.content.trim());

  // Сообщения ассистента: маленький sparkles-аватар слева (та же иконка, что
  // в Nav у "ИИ-ассистент") + белый бабл с тонкой границей. Строгий стиль:
  // никаких эмодзи, никаких акцент-баров.
  if (!isUser) {
    return (
      <div className="flex justify-start gap-2 mb-2.5">
        <div
          className={`shrink-0 mt-1 rounded-md bg-white border border-[#e4e8eb] flex items-center justify-center shadow-sm ${
            compact ? "w-6 h-6" : "w-7 h-7"
          }`}
          aria-hidden
        >
          <IconAiSpark size={compact ? 14 : 16} />
        </div>
        <div
          className={`leading-relaxed flex-1 min-w-0 ${
            compact ? "px-3 py-2 text-xs" : "px-3.5 py-2.5 text-sm"
          } bg-white text-[#1f1f22] border border-[#e4e8eb] rounded-2xl rounded-tl-md shadow-sm`}
        >
          {pendingReply ? (
            <span className="flex gap-1 py-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-[#108c7c] rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          ) : (
            <>
              {renderAssistantMessageContent(message.content)}
              {message.choiceCards &&
                message.choiceCards.length > 0 &&
                !message.revealing &&
                !message.awaitingVoice && (
                <ChoiceCards
                  cards={message.choiceCards}
                  compact={compact}
                  onPick={(text) => onChoice?.(text)}
                />
              )}
              {message.charts?.map((chart, i) => (
                <AssistantChart key={i} chart={chart} compact={compact} />
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  // Сообщения пользователя: зелёный бабл справа (как в web mobile Copilot).
  return (
    <div className="flex justify-end mb-2.5">
      <div
        className={`leading-relaxed ${
          compact ? "max-w-[90%] px-3 py-1.5 text-xs" : "max-w-[85%] px-4 py-2.5 text-sm"
        } bg-[#008064] text-white rounded-2xl rounded-tr-md shadow-sm whitespace-pre-wrap break-words`}
      >
        {message.content}
      </div>
    </div>
  );
}
