"use client";

import { useEffect, useState } from "react";
import { History, MessageSquare, RefreshCw, X, Clock, Plus, Trash2 } from "lucide-react";
import { useAssistantStore } from "@/store/assistantStore";
import { deleteChatSession, fetchChatHistory, fetchChatSessions, type ChatSessionSummary } from "@/lib/api/chat";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Опционально: текущая активная сессия (для подсветки). */
  activeSessionId?: string | null;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diff = Math.max(0, (now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.round(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.round(diff / 3600)} ч назад`;
  if (diff < 86400 * 7) return `${Math.round(diff / 86400)} дн назад`;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

/** Архив сообщений — список прошлых сессий + кнопка «Новый диалог». */
export function ChatArchive({ open, onClose, activeSessionId }: Props) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const switchSession = useAssistantStore((s) => s.switchSession);
  const startNewChat = useAssistantStore((s) => s.startNewChat);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchChatSessions(50);
      setSessions(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
  }, [open]);

  const handleOpen = async (sid: string) => {
    try {
      const msgs = await fetchChatHistory(sid);
      switchSession(sid, msgs);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleNew = () => {
    startNewChat();
    onClose();
  };

  const handleDelete = async (sid: string, isGuest: boolean) => {
    const ok = window.confirm("Удалить диалог? Это действие нельзя отменить.");
    if (!ok) return;
    try {
      const deleted = await deleteChatSession(sid, { guest: isGuest });
      if (!deleted) {
        setError("Не удалось удалить диалог — возможно, он уже удалён или нет прав.");
        return;
      }
      // Если удалили активную сессию — начинаем новый диалог, чтобы чат не висел
      // на удалённой sessionId.
      if (useAssistantStore.getState().sessionId === sid) {
        startNewChat();
      }
      // Убираем из локального списка без полного reload.
      setSessions((prev) => prev.filter((s) => s.session_id !== sid));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!open) return null;

  const own = sessions.filter((s) => !s.is_guest);
  const guest = sessions.filter((s) => s.is_guest);

  return (
    <div
      className="absolute inset-0 z-30 flex justify-end"
      role="dialog"
      aria-label="Архив сообщений"
    >
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <aside className="relative w-full sm:w-[340px] h-full bg-white border-l border-[#e4e8eb] shadow-[-12px_0_32px_rgba(0,0,0,0.08)] flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#e4e8eb] flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <History className="w-4 h-4 text-[#107f8c] shrink-0" />
            <h3 className="text-sm font-bold text-[#2c3e50] truncate">Архив сообщений</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => void load()}
              className="w-8 h-8 flex items-center justify-center rounded text-[#7d838a] hover:bg-[#f2f4f7] hover:text-[#107f8c]"
              aria-label="Обновить"
              title="Обновить"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded text-[#7d838a] hover:bg-[#f2f4f7] hover:text-[#2c3e50]"
              aria-label="Закрыть архив"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleNew}
            className="w-full flex items-center justify-center gap-1.5 bg-[#128e8b] hover:bg-[#0f7270] text-white text-xs font-bold py-2 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Новый диалог
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {error && (
            <p className="text-xs text-red-500 px-2 py-2">Ошибка: {error}</p>
          )}
          {!loading && own.length === 0 && guest.length === 0 && (
            <p className="text-xs text-[#7d838a] text-center px-4 py-8">
              Пока нет сохранённых диалогов.<br />
              Начните новый — он автоматически сохранится.
            </p>
          )}

          {own.length > 0 && (
            <Section title="Мои диалоги" count={own.length}>
              {own.map((s) => (
                <SessionRow
                  key={s.session_id}
                  session={s}
                  active={s.session_id === activeSessionId}
                  onClick={() => void handleOpen(s.session_id)}
                  onDelete={() => void handleDelete(s.session_id, false)}
                />
              ))}
            </Section>
          )}

          {guest.length > 0 && (
            <Section title="Демо-сессии" count={guest.length} muted>
              {guest.map((s) => (
                <SessionRow
                  key={s.session_id}
                  session={s}
                  active={s.session_id === activeSessionId}
                  onClick={() => void handleOpen(s.session_id)}
                  onDelete={() => void handleDelete(s.session_id, true)}
                />
              ))}
            </Section>
          )}

          {loading && sessions.length === 0 && (
            <div className="flex justify-center py-6">
              <RefreshCw className="w-4 h-4 text-[#107f8c] animate-spin" />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function Section({
  title,
  count,
  muted,
  children,
}: {
  title: string;
  count: number;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between px-2 py-1.5">
        <h4 className={`text-[10px] font-extrabold uppercase tracking-wider ${muted ? "text-[#9aa1a8]" : "text-[#7d838a]"}`}>
          {title}
        </h4>
        <span className="text-[10px] text-[#9aa1a8]">{count}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SessionRow({
  session,
  active,
  onClick,
  onDelete,
}: {
  session: ChatSessionSummary;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  // Кнопка удаления — отдельный <button>, чтобы клик по ней не
  // триггерил открытие сессии (onClick родительской кнопки).
  return (
    <div
      className={`group relative w-full text-left rounded-lg transition-colors flex items-start gap-2 ${
        active
          ? "bg-[#e5fcf7] border border-[#128e8b]/40"
          : "border border-transparent hover:bg-[#f2f4f7]"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left px-2.5 py-2 flex items-start gap-2"
      >
        <MessageSquare
          className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${active ? "text-[#128e8b]" : "text-[#7d838a] group-hover:text-[#107f8c]"}`}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold leading-tight truncate ${active ? "text-[#0f6c69]" : "text-[#2c3e50]"}`}>
            {session.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#9aa1a8]">
            <Clock className="w-2.5 h-2.5" />
            <span>{formatRelative(session.created_at)}</span>
            <span>·</span>
            <span>{session.message_count} сообщ.</span>
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Удалить диалог"
        title="Удалить диалог"
        className="shrink-0 self-center mr-1.5 w-7 h-7 rounded-md flex items-center justify-center text-[#9aa1a8] hover:text-[#e53935] hover:bg-[#fde8e8] opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
