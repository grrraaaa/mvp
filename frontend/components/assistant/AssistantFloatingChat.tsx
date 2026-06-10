"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, History, MoreHorizontal, Sparkles, X } from "lucide-react";
import { AssistantPanel } from "./AssistantPanel";
import { ChatArchive } from "./ChatArchive";
import { IconChat } from "@/components/sbbol/SbbolIcons";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTtsStore } from "@/store/ttsStore";
import { useAssistantStore } from "@/store/assistantStore";
import { useCharacterStore } from "@/store/characterStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Плавающий AI-чат поверх всех форм — перетаскиваемый, полный функционал AssistantPanel. */
export function AssistantFloatingChat({ open, onOpenChange }: Props) {
  const isMobile = useIsMobile();
  const ttsEnabled = useTtsStore((s) => s.enabled);
  const toggleTts = useTtsStore((s) => s.toggleEnabled);
  const sessionId = useAssistantStore((s) => s.sessionId);
  const characterName = useCharacterStore((s) => s.config.name);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resetChatRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!open) {
      setDragPos(null);
      setArchiveOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (isMobile) return;
    if ((e.target as HTMLElement).closest("button")) return;
    const panel = (e.currentTarget as HTMLElement).closest("[data-chat-panel]") as HTMLElement | null;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    const originX = dragPos?.x ?? rect.left;
    const originY = dragPos?.y ?? rect.top;
    if (!dragPos) setDragPos({ x: originX, y: originY });

    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: originX, origY: originY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isMobile || !dragRef.current) return;
    setDragPos({
      x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const resetChatPosition = () => {
    setDragPos(null);
    resetChatRef.current?.();
  };

  const desktopStyle = dragPos
    ? {
        left: dragPos.x,
        top: dragPos.y,
        width: 400,
        height: 560,
        minWidth: 360,
        minHeight: 480,
        maxHeight: "calc(100vh - 48px)",
      }
    : {
        right: 20,
        top: 76,
        bottom: 20,
        width: 400,
        minWidth: 360,
      };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="fixed z-[10050] flex flex-col items-center gap-1.5 group right-4 bottom-4 sm:right-6 sm:bottom-6"
          aria-label="AI-консультант"
        >
          <span className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#565b62] bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap">
            AI-консультант
          </span>
          <span className="scale-90 sm:scale-100">
            <IconChat />
          </span>
        </button>
      )}

      {open && isMobile && (
        <button
          type="button"
          className="fixed inset-0 z-[10040] bg-black/30"
          aria-label="Закрыть чат"
          onClick={() => onOpenChange(false)}
        />
      )}

      {open && (
        <div
          data-chat-panel
          className={
            isMobile
              ? "fixed inset-x-0 bottom-0 z-[10050] flex flex-col bg-white border-t border-[#d0d7dd] overflow-hidden sbbol-theme rounded-t-2xl shadow-[0_-12px_48px_rgba(0,0,0,0.2)] h-[min(94dvh,780px)] max-h-[94dvh]"
              : "fixed z-[10050] flex flex-col bg-white rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.16)] border border-[#d0d7dd] overflow-hidden sbbol-theme"
          }
          style={isMobile ? undefined : desktopStyle}
        >
          {isMobile && (
            <div className="flex justify-center pt-2 pb-1 flex-shrink-0" aria-hidden>
              <div className="w-10 h-1 rounded-full bg-[#d0d7dd]" />
            </div>
          )}

          <div
            className={`flex items-center justify-between flex-shrink-0 border-b border-[#e4e8eb] bg-white ${
              isMobile ? "px-3 py-2" : "px-4 py-2.5 cursor-move select-none"
            }`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1c8a82] to-[#0d6e68] flex items-center justify-center text-white shrink-0 shadow-sm"
                aria-hidden
              >
                <Sparkles className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-[#1f1f22] truncate leading-tight">
                  Ассистент {characterName}
                </span>
                <span className="text-[11px] font-medium text-[#0a8064] flex items-center gap-1 leading-tight">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] inline-block" />
                  Онлайн
                </span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setArchiveOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded text-[#7d838a] hover:bg-[#f2f4f7] hover:text-[#0d6e68]"
                aria-label="Архив сообщений"
                title="Архив сообщений"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={toggleTts}
                className={`w-8 h-8 flex items-center justify-center rounded ${
                  ttsEnabled ? "text-[#0d6e68] bg-[#e5fcf7]" : "text-[#7d838a] hover:bg-[#f2f4f7]"
                }`}
                aria-label={ttsEnabled ? "Выключить озвучку" : "Включить озвучку"}
                title={ttsEnabled ? "Озвучка включена" : "Озвучка выключена"}
              >
                {ttsEnabled ? <Volume2 className="w-4 h-4" aria-hidden /> : <VolumeX className="w-4 h-4" aria-hidden />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  resetChatPosition();
                }}
                className="hidden sm:flex w-8 h-8 items-center justify-center rounded text-[#7d838a] hover:bg-[#f2f4f7] hover:text-[#0d6e68]"
                aria-label="Меню"
                title="Меню"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <button
                type="button"
                data-close
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 flex items-center justify-center text-[#7d838a] hover:bg-[#f2f4f7] hover:text-[#1f1f22] rounded"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
            <AssistantPanel
              variant="embedded"
              compactMobile={isMobile}
              onRegisterReset={(fn) => {
                resetChatRef.current = fn;
              }}
            />
            <ChatArchive
              open={archiveOpen}
              onClose={() => setArchiveOpen(false)}
              activeSessionId={sessionId}
            />
          </div>
        </div>
      )}
    </>
  );
}
