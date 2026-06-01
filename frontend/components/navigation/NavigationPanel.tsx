"use client";

import type { NavigationStep } from "@/store/assistantStore";

interface Props {
  steps: NavigationStep[];
}

export function NavigationPanel({ steps }: Props) {
  return (
    <div className="flex items-center gap-1.5 sber-panel px-4 py-2 rounded-full border text-sm">
      {steps.map((step, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-sber-green/50">→</span>}
          <span
            className={
              i === steps.length - 1
                ? "text-sber-green-light font-medium"
                : "text-sber-muted"
            }
          >
            {step.label}
          </span>
        </span>
      ))}
    </div>
  );
}
