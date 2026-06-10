"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { applyFormActionsWithRetry } from "@/lib/assistant/formFillRunner";
import { showStubToast } from "@/lib/sbbol/stubToast";
import { useAssistantStore } from "@/store/assistantStore";

/** Глобально применяет form_actions от ассистента с повторами после навигации. */
export function FormFillBridge() {
  const pathname = usePathname();
  const formActions = useAssistantStore((s) => s.formActions);
  const clearFormActions = useAssistantStore((s) => s.clearFormActions);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!formActions?.length || runningRef.current) return;

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
  }, [formActions, pathname, clearFormActions]);

  return null;
}
