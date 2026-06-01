"use client";

import { useEffect, useRef, useState } from "react";
import { AssistantPanel } from "./AssistantPanel";
import { IconChat, IconClose } from "@/components/sbbol/SbbolIcons";
import { useIsMobile } from "@/hooks/useIsMobile";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Плавающий AI-чат в стиле «Чат с банком» на демо СберБизнес */
export function AssistantFloatingChat({ open, onOpenChange }: Props) {
  const isMobile = useIsMobile();
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    if (!open) setDragPos(null);
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
    if ((e.target as HTMLElement).closest("button[data-close]")) return;
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

  const desktopStyle = dragPos
    ? { left: dragPos.x, top: dragPos.y, width: 360, height: 520, minWidth: 360, minHeight: 480 }
    : { right: 24, bottom: 24, width: 360, height: 520, minWidth: 360, minHeight: 480 };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="fixed z-50 flex flex-col items-center gap-1 group right-3 bottom-3 sm:right-6 sm:bottom-6"
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
              ? "fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white border-t border-[#d0d7dd] overflow-hidden sbbol-theme rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.18)] max-h-[min(78vh,640px)]"
              : "fixed z-50 flex flex-col bg-white rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.18)] border border-[#d0d7dd] overflow-hidden sbbol-theme"
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
              isMobile ? "px-3 py-2" : "px-4 py-3 cursor-move select-none"
            }`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div className="flex items-center gap-2 min-w-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="flex-shrink-0 sm:w-6 sm:h-6">
                <path d="M7.18 7.18L17.08 17.08M17.08 17.08V10.72M17.08 17.08H10.72" stroke="#107F8C" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-semibold text-[#1f1f22] truncate">AI-консультант</span>
            </div>
            <button
              type="button"
              data-close
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 flex items-center justify-center text-[#107f8c] hover:bg-[#f2f4f7] rounded flex-shrink-0"
              aria-label="Закрыть"
            >
              <IconClose className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <AssistantPanel variant="embedded" compactMobile={isMobile} />
          </div>
        </div>
      )}
    </>
  );
}
