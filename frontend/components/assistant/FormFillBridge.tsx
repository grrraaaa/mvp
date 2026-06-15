"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { applyFormActionsWithRetry } from "@/lib/assistant/formFillRunner";
import { showStubToast } from "@/lib/sbbol/stubToast";
import { useAssistantStore } from "@/store/assistantStore";
import { useRole } from "@/store/roleStore";

/** Глобально применяет form_actions от ассистента с повторами после навигации. */
export function FormFillBridge() {
  const pathname = usePathname();
  const formActions = useAssistantStore((s) => s.formActions);
  const clearFormActions = useAssistantStore((s) => s.clearFormActions);
  const addMessage = useAssistantStore((s) => s.addMessage);
  const { can, denyTitle } = useRole();
  const canFormatDocumentAi = can("format_document_ai");
  const runningRef = useRef(false);

  useEffect(() => {
    if (!formActions?.length || runningRef.current) return;

    /** Независимо от того, как form_actions попали в стор (от LLM, от OCR,
     *  от прошлой роли до переключения), блокируем применение для ролей
     *  без права format_document_ai. Без этой проверки admin мог обойти
     *  блокировки в AssistantPanel, если formActions уже лежали в сторе. */
    if (!canFormatDocumentAi) {
      addMessage({
        role: "assistant",
        content: `🚫 ${denyTitle("format_document_ai")}\n\nИИ-ассистент не может заполнять/форматировать документы для вашей роли.`,
      });
      clearFormActions();
      return;
    }

    runningRef.current = true;
    let cancelled = false;

    void (async () => {
      const result = await applyFormActionsWithRetry(formActions, { pathname });
      if (cancelled) return;

      if (result?.filled.length) {
        showStubToast(`Заполнено: ${result.filled.join(", ")}`);
      } else if (formActions.length > 0) {
        showStubToast("Откройте форму платежа (/payments/paydocbyn) и повторите запрос, например: «сумма 500»");
      }
      if (result?.failed.length) {
        showStubToast(`Не удалось изменить: ${result.failed.join(", ")}`);
      }

      clearFormActions();
      runningRef.current = false;
    })();

    return () => {
      cancelled = true;
      runningRef.current = false;
    };
  }, [formActions, pathname, clearFormActions, canFormatDocumentAi, denyTitle, addMessage]);

  return null;
}
