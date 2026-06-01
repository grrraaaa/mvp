"use client";

import { useEffect, useRef } from "react";
import { useSbbolOrigPageInteractions } from "@/hooks/useSbbolOrigPageInteractions";
import { useSbbolFormFill } from "@/hooks/useSbbolFormFill";
import type { OrigPageInteractionConfig } from "@/lib/sbbol/origPageRoutes";

interface Props {
  html: string;
  interactions?: OrigPageInteractionConfig;
}

const ORIG_STYLES = [
  "/sber-orig/static/fonts/fonts.css",
  "/sber-orig/static/main.bundle.css",
  "/sber-orig/static/745.bundle.css",
];

/** Pixel-perfect SBBOL page fragment from captured sbbol.bps-sberbank.by HTML. */
export function SbbolOrigPageContent({ html, interactions }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Set markup once per capture — avoid dangerouslySetInnerHTML on every render,
  // which would wipe values after useSbbolFormFill runs and clearFormActions().
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.innerHTML = html;
  }, [html]);

  useSbbolOrigPageInteractions(rootRef, interactions, [html, interactions]);
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
      forms.forEach((form) => {
        form.removeEventListener("submit", blockSubmit, true);
      });
    };
  }, [html]);

  return (
    <>
      {ORIG_STYLES.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <div ref={rootRef} className="sbbol-orig-root bodyWidth min-h-full bg-[#f2f4f7]" />
    </>
  );
}
