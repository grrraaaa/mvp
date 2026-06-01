"use client";

import { AssistantPanel } from "./AssistantPanel";

interface Props {
  className?: string;
}

/** AI-консультант в светлой обёртке СБОЛ */
export function AssistantDialog({ className = "" }: Props) {
  return (
    <aside
      className={`sbbol-theme flex flex-col bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden ${className}`}
    >
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#21A038] to-[#0A9B2E] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
            AI
          </div>
          <div>
            <p className="text-white font-semibold text-sm">AI-консультант</p>
            <p className="text-white/75 text-[10px]">Услуги Сбер Банка · sber-bank.by</p>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <AssistantPanel variant="embedded" />
      </div>
    </aside>
  );
}
