"use client";

import { useEffect, useRef } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import { AssistantPanel } from "./AssistantPanel";
import { IconChat } from "@/components/sbbol/SbbolIcons";
import { useIsMobile } from "@/hooks/useIsMobile";
import { AssistantVoicePicker } from "./AssistantVoicePicker";
import { useTtsStore } from "@/store/ttsStore";
import { useRole } from "@/store/roleStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** AI-ассистент: на десктопе — боковая панель как Copilot в web mobile */
export function AssistantFloatingChat({ open, onOpenChange }: Props) {
  const isMobile = useIsMobile();
  const ttsEnabled = useTtsStore((s) => s.enabled);
  const toggleTts = useTtsStore((s) => s.toggleEnabled);
  const { role } = useRole();
  const resetChatRef = useRef<(() => void) | null>(null);

  const assistantName = role.gender === "male" ? "Александр" : "Александра";

  useEffect(() => {
    if (!open || !isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  return (
    <>
      {!open && isMobile && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="fixed z-50 flex flex-col items-center gap-1.5 group right-4 bottom-4"
          aria-label="ИИ-ассистент"
        >
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-550 bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap">
            ИИ-ассистент
          </span>
          <span className="scale-90">
            <IconChat />
          </span>
        </button>
      )}

      {open && isMobile && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30"
          aria-label="Закрыть чат"
          onClick={() => onOpenChange(false)}
        />
      )}

      {open && (
        <div
          data-chat-panel
          className={
            isMobile
              ? "fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white border-t border-gray-200 overflow-hidden sbbol-theme rounded-t-2xl shadow-[0_-12px_48px_rgba(0,0,0,0.2)] h-[min(94dvh,780px)] max-h-[94dvh]"
              : "fixed top-16 bottom-0 right-0 z-50 w-full sm:w-[410px] flex flex-col bg-white border-l border-gray-200 shadow-xl sbbol-theme"
          }
        >
          {isMobile && (
            <div className="flex justify-center pt-2 pb-1 flex-shrink-0" aria-hidden>
              <div className="w-10 h-1 rounded-full bg-gray-150" />
            </div>
          )}

          <div
            className={`flex items-center justify-between flex-shrink-0 border-b border-gray-100 bg-white ${
              isMobile ? "px-3 py-2" : "px-4 py-3"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-[#008064] shrink-0">
                <img
                  src={role.portrait}
                  alt={assistantName}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: "50% 18%" }}
                />
                <span className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-emerald-500 border border-white rounded-full" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-805 truncate">Ассистент {assistantName}</div>
                <div className="text-[10px] text-emerald-505 font-semibold">онлайн</div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <AssistantVoicePicker theme="embedded" />
              <button
                type="button"
                onClick={toggleTts}
                className={`w-8 h-8 flex items-center justify-center rounded ${
                  ttsEnabled ? "text-[#008064] bg-emerald-50" : "text-gray-450 hover:bg-gray-50"
                }`}
                aria-label={ttsEnabled ? "Выключить озвучку" : "Включить озвучку"}
                title={ttsEnabled ? "Озвучка включена" : "Озвучка выключена"}
              >
                {ttsEnabled ? <Volume2 className="w-5 h-5" aria-hidden /> : <VolumeX className="w-5 h-5" aria-hidden />}
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-450 hover:bg-gray-50 rounded"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#F7F9FB]">
            <AssistantPanel
              variant="embedded"
              compactMobile={isMobile}
              onRegisterReset={(fn) => {
                resetChatRef.current = fn;
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
