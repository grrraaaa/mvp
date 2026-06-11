"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX, History, MoreHorizontal, X, MessageSquare } from "lucide-react";
import { AssistantPanel } from "./AssistantPanel";
import { ChatArchive } from "./ChatArchive";
import { IconAiSpark } from "./IconAiSpark";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTtsStore } from "@/store/ttsStore";
import { useAssistantStore } from "@/store/assistantStore";
import { useCharacterStore } from "@/store/characterStore";
import { useAssistantDockStore } from "@/store/assistantDockStore";

/**
 * Док-панель AI-чата в правой колонке (как Copilot).
 * - Desktop ≥ lg: зафиксированная колонка 360px, сворачивается в вертикальный таб
 * - Mobile < lg: FAB + bottom sheet (как раньше)
 */
export function AssistantDockPanel() {
  const isMobile = useIsMobile(1024);
  const ttsEnabled = useTtsStore((s) => s.enabled);
  const toggleTts = useTtsStore((s) => s.toggleEnabled);
  const sessionId = useAssistantStore((s) => s.sessionId);
  const characterName = useCharacterStore((s) => s.config.name);
  const collapsed = useAssistantDockStore((s) => s.collapsed);
  const setCollapsed = useAssistantDockStore((s) => s.setCollapsed);
  const expand = useAssistantDockStore((s) => s.expand);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Mobile: bottom sheet + FAB
  if (isMobile) {
    return (
      <>
        {!mobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="fixed z-[10050] flex flex-col items-center gap-1.5 group right-4 bottom-4 sm:right-6 sm:bottom-6"
            aria-label="AI-консультант"
          >
            <span className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#565b62] bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap">
              AI-консультант
            </span>
            <span className="scale-90 sm:scale-100">
              <MessageSquare className="w-6 h-6 text-[#0d6e68]" />
            </span>
          </button>
        )}

        {mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 z-[10040] bg-black/30"
            aria-label="Закрыть чат"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {mobileOpen && (
          <div className="fixed inset-x-0 bottom-0 z-[10050] flex flex-col bg-white border-t border-[#d0d7dd] overflow-hidden sbbol-theme rounded-t-2xl shadow-[0_-12px_48px_rgba(0,0,0,0.2)] h-[min(94dvh,780px)] max-h-[94dvh]">
            <div className="flex justify-center pt-2 pb-1 flex-shrink-0" aria-hidden>
              <div className="w-10 h-1 rounded-full bg-[#d0d7dd]" />
            </div>
            <DockHeader
              characterName={characterName}
              ttsEnabled={ttsEnabled}
              toggleTts={toggleTts}
              onArchive={() => setArchiveOpen(true)}
              onClose={() => setMobileOpen(false)}
              compact
            />
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
              <AssistantPanel variant="embedded" compactMobile />
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

  // Desktop: docked column
  return (
    <>
      <aside
        aria-label="AI-консультант"
        className={`hidden lg:flex flex-col bg-white overflow-hidden sbbol-theme transition-[width] duration-200 ease-out flex-shrink-0 sticky top-16 self-start h-[calc(100vh-4rem)] shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.08)] ${
          collapsed ? "w-0" : "w-[420px] xl:w-[460px] 2xl:w-[500px]"
        }`}
      >
        <div
          className={`flex flex-col h-full ${
            collapsed
              ? "invisible w-0"
              : "visible min-w-[420px] xl:min-w-[460px] 2xl:min-w-[500px]"
          }`}
        >
          <DockHeader
            characterName={characterName}
            ttsEnabled={ttsEnabled}
            toggleTts={toggleTts}
            onArchive={() => setArchiveOpen(true)}
            onClose={() => setCollapsed(true)}
          />
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
            <AssistantPanel variant="embedded" />
            <ChatArchive
              open={archiveOpen}
              onClose={() => setArchiveOpen(false)}
              activeSessionId={sessionId}
            />
          </div>
        </div>
      </aside>

      {/* Таб-развёртка когда свернули */}
      {collapsed && (
        <button
          type="button"
          onClick={expand}
          className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-2 bg-white border border-[#e4e8eb] border-r-0 rounded-l-xl shadow-md px-2 py-4 hover:bg-[#f6faf9] transition-colors"
          aria-label="Развернуть ИИ-ассистент"
          title="Развернуть ИИ-ассистент"
        >
          <IconAiSpark size={20} />
          <span
            className="text-[11px] font-semibold text-[#0d6e68] tracking-wide"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            ИИ-ассистент
          </span>
        </button>
      )}
    </>
  );
}

function DockHeader({
  characterName,
  ttsEnabled,
  toggleTts,
  onArchive,
  onClose,
  compact = false,
}: {
  characterName: string;
  ttsEnabled: boolean;
  toggleTts: () => void;
  onArchive: () => void;
  onClose: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between flex-shrink-0 border-b border-[#e4e8eb] bg-white ${
        compact ? "px-3 py-2" : "px-4 py-2.5"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm border border-[#e4e8eb]"
          aria-hidden
        >
          <IconAiSpark size={22} />
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
          onClick={onArchive}
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
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center text-[#7d838a] hover:bg-[#f2f4f7] hover:text-[#1f1f22] rounded"
          aria-label="Свернуть"
          title="Свернуть"
        >
          {compact ? <X className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
        <button
          type="button"
          className="hidden xl:flex w-8 h-8 items-center justify-center rounded text-[#7d838a] hover:bg-[#f2f4f7] hover:text-[#0d6e68]"
          aria-label="Меню"
          title="Меню"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
