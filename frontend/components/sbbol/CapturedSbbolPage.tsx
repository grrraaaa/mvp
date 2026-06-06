"use client";

import { useEffect, useRef } from "react";
import { useSbbolOrigPageInteractions } from "@/hooks/useSbbolOrigPageInteractions";
import { useSbbolAccountPicker } from "@/hooks/useSbbolAccountPicker";
import { useSbbolFormFill } from "@/hooks/useSbbolFormFill";
import { highlightOcrFields, submitPaymentFormFromDom, useSbbolPaymentValidation } from "@/hooks/useSbbolPaymentValidation";
import { showStubToast } from "@/lib/sbbol/stubToast";
import type { OrigPageInteractionConfig } from "@/lib/sbbol/origPageRoutes";

interface Props {
  html: string;
  interactions?: OrigPageInteractionConfig;
}

/** Pixel-matched fragment from captured sbbol.bps-sberbank.by HTML. */
export function CapturedSbbolPage({ html, interactions }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.innerHTML = html;
  }, [html]);

  useSbbolOrigPageInteractions(rootRef, interactions, [html, interactions]);
  useSbbolAccountPicker(rootRef, [html]);
  useSbbolFormFill(rootRef);
  useSbbolPaymentValidation(rootRef);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onSubmit = async (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const isPaymentForm = Boolean(root.querySelector("[name*='forms.PAYDOC'], [name*='forms.INSTANT']"));
      if (isPaymentForm) {
        highlightOcrFields(root);
        const result = await submitPaymentFormFromDom(root);
        showStubToast(result.message);
        return;
      }
      showStubToast("Форма сохранена (демо-режим)");
    };

    root.addEventListener("submit", onSubmit, true);
    const forms = Array.from(root.querySelectorAll("form"));
    forms.forEach((form) => {
      form.setAttribute("novalidate", "novalidate");
      form.addEventListener("submit", onSubmit, true);
    });

    return () => {
      root.removeEventListener("submit", onSubmit, true);
      forms.forEach((form) => form.removeEventListener("submit", onSubmit, true));
    };
  }, [html]);

  return (
    <div ref={rootRef} className="sbbol-orig-root bodyWidth min-h-full bg-sbbol-bg" />
  );
}
