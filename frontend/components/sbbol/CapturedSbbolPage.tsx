"use client";

import { useEffect, useRef } from "react";
import { useSbbolOrigPageInteractions } from "@/hooks/useSbbolOrigPageInteractions";
import { useSbbolAccountPicker } from "@/hooks/useSbbolAccountPicker";
import { useSbbolFormFill } from "@/hooks/useSbbolFormFill";
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

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const blockSubmit = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    root.addEventListener("submit", blockSubmit, true);
    const forms = Array.from(root.querySelectorAll("form"));
    forms.forEach((form) => {
      form.setAttribute("novalidate", "novalidate");
      form.addEventListener("submit", blockSubmit, true);
    });

    return () => {
      root.removeEventListener("submit", blockSubmit, true);
      forms.forEach((form) => form.removeEventListener("submit", blockSubmit, true));
    };
  }, [html]);

  return (
    <div ref={rootRef} className="sbbol-orig-root bodyWidth min-h-full bg-sbbol-bg" />
  );
}
