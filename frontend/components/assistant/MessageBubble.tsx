"use client";

import type { ChatMessage } from "@/store/assistantStore";
import { AssistantChart } from "@/components/assistant/AssistantChart";
import { ForecastCard } from "@/components/assistant/ForecastCard";
import { renderAssistantMessageContent } from "@/lib/assistant/renderMessageContent";

interface Props {
  message: ChatMessage;
  isTyping?: boolean;
  compact?: boolean;
}

export function MessageBubble({ message, isTyping, compact }: Props) {
  const isUser = message.role === "user";

  // Если в chart_payload лежит прогноз — рендерим ForecastCard вместо обычного PNG-чарта
  // по соответствующему индексу в message.charts. Иначе — стандартный путь.
  const forecast = message.chartPayload?.forecast;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-1`}>
      {!isUser && (
        <div
          className={`mr-1.5 mt-0.5 flex-shrink-0 flex items-center justify-center font-black text-white bg-[#008064] ${
            compact ? "w-6 h-6 text-[10px] rounded-md" : "w-7 h-7 text-[11px] rounded-lg"
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
            {forecast ? (
              <ForecastCard payload={forecast} compact={compact} />
            ) : (
              message.charts?.map((chart, i) => (
                <AssistantChart key={i} chart={chart} compact={compact} />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function MessageBubble({ message, isTyping, compact, onChoice }: Props) {
  const isUser = message.role === "user";

  // Сообщения ассистента: серый фон + вертикальный акцент-бар слева,
  // без круглого аватара (имя и аватар теперь в шапке чата).
  if (!isUser) {
    return (
      <div className="flex justify-start mb-1.5">
        <div
          className={`relative leading-relaxed w-full ${
            compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"
          } bg-[#f2f4f7] text-[#1f1f22] rounded-2xl rounded-tl-md overflow-hidden`}
        >
          <span
            className="absolute left-0 top-0 bottom-0 w-1 bg-[#cbd5e1]"
            aria-hidden
          />
          {isTyping ? (
            <span className="flex gap-1 py-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-[#0a8064] rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          ) : (
            <>
              {renderAssistantMessageContent(message.content)}
              {message.choiceCards && message.choiceCards.length > 0 && (
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
    <div className="flex justify-end mb-1.5">
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
