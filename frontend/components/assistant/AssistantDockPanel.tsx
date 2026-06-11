"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX, History, X } from "lucide-react";
import { AssistantPanel } from "./AssistantPanel";
import { ChatArchive } from "./ChatArchive";
import { IconAiSpark } from "./IconAiSpark";
import { PersonalizationMenu } from "./PersonalizationMenu";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTtsStore } from "@/store/ttsStore";
import { useAssistantStore } from "@/store/assistantStore";
import { useCharacterStore } from "@/store/characterStore";
import { useAssistantDockStore } from "@/store/assistantDockStore";

/**
 * Док-панель AI-чата в правой колонке (как Copilot).
 * - Desktop ≥ lg: зафиксированная колонка 360px, сворачивается в вертикальный таб
 * - Mobile < lg: bottom sheet (открывается из navbar)
 */
export function AssistantDockPanel() {
  const isMobile = useIsMobile(1024);
  const ttsEnabled = useTtsStore((s) => s.enabled);
  const toggleTts = useTtsStore((s) => s.toggleEnabled);
  const sessionId = useAssistantStore((s) => s.sessionId);
  const collapsed = useAssistantDockStore((s) => s.collapsed);
  const setCollapsed = useAssistantDockStore((s) => s.setCollapsed);
  const expand = useAssistantDockStore((s) => s.expand);
  const mobileOpen = useAssistantDockStore((s) => s.mobileOpen);
  const setMobileOpen = useAssistantDockStore((s) => s.setMobileOpen);
  const setSettingsOpen = useCharacterStore((s) => s.setSettingsOpen);
  const [archiveOpen, setArchiveOpen] = useState(false);

  // Mobile: bottom sheet (открывается из navbar «ИИ-ассистент»)
  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 z-[10040] bg-black/30"
            aria-label="Закрыть чат"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {mobileOpen && (
          <div className="fixed inset-x-0 bottom-0 z-[10050] flex flex-col bg-assistant-surface border-t border-assistant-surface-border overflow-hidden sbbol-theme rounded-t-2xl shadow-[0_-12px_48px_rgba(0,0,0,0.2)] h-[min(94dvh,780px)] max-h-[94dvh]">
            <div className="flex justify-center pt-2 pb-1 flex-shrink-0" aria-hidden>
              <div className="w-10 h-1 rounded-full bg-[#d0d7dd]" />
            </div>
            <DockHeader
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
        className={`hidden lg:flex flex-col bg-assistant-surface overflow-hidden sbbol-theme transition-[right,width] duration-200 ease-out fixed top-16 bottom-0 z-30 w-[420px] xl:w-[460px] 2xl:w-[500px] border-l border-assistant-surface-border ${
          collapsed
            ? "right-[-420px] xl:right-[-460px] 2xl:right-[-500px]"
            : "right-0"
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
            ttsEnabled={ttsEnabled}
            toggleTts={toggleTts}
            onArchive={() => setArchiveOpen(true)}
            onClose={() => setCollapsed(true)}
            onOpenAbilities={() => setSettingsOpen(true)}
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
          className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 items-center bg-assistant-surface border border-assistant-surface-border border-r-0 rounded-l-xl shadow-md p-3 hover:bg-[#f3f5f7] transition-colors"
          aria-label="Развернуть ИИ-ассистент"
          title="Развернуть ИИ-ассистент"
        >
          <IconAiSpark size={20} />
        </button>
      )}
    </>
  );
}

function DockHeader({
  ttsEnabled,
  toggleTts,
  onArchive,
  onClose,
  onOpenAbilities,
  compact = false,
}: {
  ttsEnabled: boolean;
  toggleTts: () => void;
  onArchive: () => void;
  onClose: () => void;
  onOpenAbilities?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-end flex-shrink-0 bg-transparent ${
        compact ? "px-3 py-2" : "px-4 py-2.5"
      }`}
    >
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
          <X className="w-4 h-4" />
        </button>
        <PersonalizationMenu
          onOpenAbilities={onOpenAbilities}
          compact={compact}
        />
      </div>
    </div>
  );
}
