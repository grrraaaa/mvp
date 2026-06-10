"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ProductCard } from "./ProductCard";
import { ActionButtons } from "./ActionButtons";
import { AssistantCharacter } from "./AssistantCharacter";
import { CharacterSettings } from "./CharacterSettings";
import { useAssistantStore } from "@/store/assistantStore";
import { useAuthStore } from "@/store/authStore";
import { useCharacterStore } from "@/store/characterStore";
import { getSbbolPageContext } from "@/lib/sbbol/formContext";
import { getAssistantQuickChips } from "@/lib/sbbol/assistantQuickChips";
import { ocrFillForm, readFileAsDataUrl } from "@/lib/api/forms";
import { apiUrl } from "@/lib/api/baseUrl";
import { authHeaders } from "@/lib/auth/tokenRef";
import { executeUiActions } from "@/lib/assistant/uiBridge";
import { useAssistantSpeech } from "@/hooks/useAssistantSpeech";
import { SourceChips } from "./SourceChips";
import { documentViewPath, isDocumentUuid } from "@/lib/banking/documentDeepLink";
import { buildHighlightUrl } from "@/lib/sbbol/fieldHighlight";
import { NotificationBanner } from "./NotificationBanner";
import { fetchNotifications, fetchOrgProfile, type SmartNotification } from "@/lib/api/banking";
import { fetchChatHistory, streamChatMessage } from "@/lib/api/chat";
import { useCharacterBehaviorStore } from "@/store/characterBehaviorStore";
import type { SourceRef } from "@/store/assistantStore";

interface Props {
  variant?: "default" | "embedded";
  /** Passed from floating chat on narrow screens */
  compactMobile?: boolean;
  /** Floating chat: scroll to welcome / top */
  onRegisterReset?: (reset: () => void) => void;
}

export function AssistantPanel({ variant = "default", compactMobile = false, onRegisterReset }: Props) {
  const [input, setInput] = useState("");
  const [orgName, setOrgName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const embedded = variant === "embedded";
  const inputCompact = embedded || compactMobile;
  const pageContext = useMemo(() => getSbbolPageContext(pathname), [pathname]);
  const quickChips = useMemo(
    () => getAssistantQuickChips(pathname, { mobile: inputCompact }),
    [pathname, inputCompact],
  );
  const {
    messages,
    isLoading,
    sessionId,
    suggestedChips,
    useStreaming,
    historyLoaded,
    addMessage,
    updateLastAssistant,
    setLoading,
    setNavigationPath,
    applyFormActions,
    setSessionId,
    setSuggestedChips,
    setLastEmotion,
    lastEmotion,
    loadMessages,
  } = useAssistantStore();
  const orgId = useAuthStore((s) => s.user?.org_id);
  const { config, setSettingsOpen } = useCharacterStore();
  const { speak, stop: stopSpeech } = useAssistantSpeech();
  const { setEmotion } = useCharacterBehaviorStore();
  const lastSpokenCountRef = useRef(0);
  const lastToneRef = useRef<string | undefined>(undefined);

  const lastAssistantText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].content;
    }
    return null;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (messages.length <= lastSpokenCountRef.current) return;

    const last = messages[messages.length - 1];
    if (last?.role !== "assistant" || !last.content.trim()) {
      lastSpokenCountRef.current = messages.length;
      return;
    }

    lastSpokenCountRef.current = messages.length;
    void speak(last.content, { tone: lastToneRef.current, emotion: lastEmotion ?? undefined });
  }, [messages, isLoading, speak, lastEmotion]);

  useEffect(() => {
    if (!sessionId) {
      setSessionId(crypto.randomUUID());
    }
  }, [sessionId, setSessionId]);

  useEffect(() => {
    if (historyLoaded || !sessionId) return;
    void fetchChatHistory(sessionId).then((msgs) => {
      if (msgs.length > 0) loadMessages(msgs);
    });
  }, [sessionId, historyLoaded, loadMessages]);

  const mergedChips = useMemo(() => {
    const dynamic = suggestedChips ?? [];
    const staticChips = quickChips.filter((c) => !dynamic.includes(c));
    return [...dynamic, ...staticChips].slice(0, inputCompact ? 5 : 8);
  }, [suggestedChips, quickChips, inputCompact]);

  const hideSuggestions = messages.length > 0 && suggestedChips.length === 0 && !input.trim();

  useEffect(() => () => stopSpeech(), [stopSpeech]);

  useEffect(() => {
    void fetchOrgProfile()
      .then((org) => {
        setOrgName(org.org_name);
        setUserRole(org.user_role);
      })
      .catch(() => {
        setOrgName(null);
        setUserRole(null);
      });
    void fetchNotifications(true)
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [orgId]);

  useEffect(() => {
    onRegisterReset?.(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [onRegisterReset]);

  const applyAssistantPayload = useCallback(
    (data: Record<string, unknown>) => {
      if (data.navigation_path) {
        setNavigationPath(data.navigation_path as never);
        const target = (data.navigation_path as { url: string }[])[
          (data.navigation_path as unknown[]).length - 1
        ]?.url;
        if (target?.startsWith("/")) router.push(target);
      }
      if (data.session_id) setSessionId(data.session_id as string);
      const pendingFormActions = data.form_actions as never;
      if (pendingFormActions && (pendingFormActions as unknown[]).length) {
        const hasNav = Boolean(
          (data.navigation_path as unknown[] | undefined)?.length ||
            (data.ui_actions as { type: string; target: string }[] | undefined)?.some(
              (a) => a.type === "navigate" && a.target?.startsWith("/"),
            ),
        );
        if (hasNav) {
          window.setTimeout(() => applyFormActions(pendingFormActions), 120);
        } else {
          applyFormActions(pendingFormActions);
        }
      }
      if (data.ui_actions && (data.ui_actions as unknown[]).length) {
        for (const a of data.ui_actions as { type: string; target: string }[]) {
          if (a.type === "navigate" && a.target?.startsWith("/")) {
            router.push(a.target);
          } else {
            executeUiActions([a]);
          }
        }
      }
      if (data.suggested_chips) setSuggestedChips(data.suggested_chips as string[]);
      if (data.character_emotion) {
        setLastEmotion(data.character_emotion as string);
        setEmotion(data.character_emotion as string);
      }
      lastToneRef.current = data.response_tone as string | undefined;
    },
    [applyFormActions, router, setEmotion, setLastEmotion, setNavigationPath, setSessionId, setSuggestedChips],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      const trimmed = text.trim();
      setInput("");
      addMessage({ role: "user", content: trimmed });
      setLoading(true);

      const body = {
        message: trimmed,
        session_id: sessionId,
        page_route: pageContext.page_route,
        form_type: pageContext.form_type,
        org_id: orgId,
      };

      try {
        if (useStreaming) {
          addMessage({ role: "assistant", content: "", streaming: true });
          const data = await streamChatMessage(body, (partial) => {
            updateLastAssistant({ content: partial });
          });
          applyAssistantPayload(data);
          updateLastAssistant({
            content: (data.message as string) || "",
            streaming: false,
            products: data.products as never,
            actionButtons: data.action_buttons as never,
            navigationPath: data.navigation_path as never,
            pendingFormFields: data.pending_form_fields as never,
            formFillStatus: data.form_fill_status as never,
            sources: data.sources as never,
            charts: data.charts as never,
          });
        } else {
          const chatPath = authHeaders().Authorization ? "/api/chat" : "/api/chat/guest";
          const res = await fetch(apiUrl(chatPath), {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          applyAssistantPayload(data);
          addMessage({
            role: "assistant",
            content: data.message,
            products: data.products,
            actionButtons: data.action_buttons,
            navigationPath: data.navigation_path,
            pendingFormFields: data.pending_form_fields,
            formFillStatus: data.form_fill_status,
            sources: data.sources,
            charts: data.charts,
          });
        }
      } catch (err) {
        console.error("[AssistantPanel] fetch error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        updateLastAssistant({
          content: `Не удалось связаться с сервером.\nРазделы СберБизнес доступны в меню слева.\n\n${msg}`,
          streaming: false,
        });
        if (!useStreaming) {
          addMessage({
            role: "assistant",
            content: `Не удалось связаться с сервером.\nРазделы СберБизнес доступны в меню слева.\n\n${msg}`,
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [
      addMessage,
      applyAssistantPayload,
      isLoading,
      orgId,
      pageContext,
      sessionId,
      setLoading,
      updateLastAssistant,
      useStreaming,
    ],
  );

  const handleShowSource = useCallback(
    (source: SourceRef) => {
      if (source.url?.startsWith("/")) {
        try {
          const parsed = new URL(source.url, window.location.origin);
          const highlightParam = parsed.searchParams.get("highlight");
          if (isDocumentUuid(highlightParam)) {
            router.push(documentViewPath(highlightParam!));
            return;
          }
          if (parsed.pathname === "/other/documents/view" || parsed.searchParams.has("doc")) {
            router.push(source.url);
            return;
          }
        } catch {
          /* use source.url as-is */
        }
        const url = source.highlight_fields?.length
          ? buildHighlightUrl(source.url, source.highlight_fields)
          : source.url;
        router.push(url);
        return;
      }
      if (source.url && /^https?:\/\//i.test(source.url)) {
        window.open(source.url, "_blank", "noopener,noreferrer");
        return;
      }
    },
    [router],
  );

  const handleSuggestionSelect = useCallback(
    (text: string) => {
      const sourceMatch = text.match(/^Покажи источник №(\d+)$/i);
      if (sourceMatch) {
        const index = Number.parseInt(sourceMatch[1], 10);
        const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
        const source = lastAssistant?.sources?.find((s) => s.index === index);
        if (source) {
          handleShowSource(source);
          return;
        }
      }
      void sendMessage(text);
    },
    [handleShowSource, messages, sendMessage],
  );

  const fieldChipPrefix: Record<string, string> = {
    Сумма: "Сумма ",
    "Сумма перевода": "Сумма перевода ",
    "Назначение платежа": "Назначение ",
    "№ документа": "Номер документа ",
    "Дата документа": "Дата ",
    "Очередность платежа": "Очередность ",
    "Получатель / контрагент": "Получатель ",
    "Счёт получателя": "Счёт получателя ",
  };

  const handleSend = () => sendMessage(input);

  const handlePhotoOcr = useCallback(
    async (file: File) => {
      if (isLoading) return;
      if (!pageContext.form_type) {
        addMessage({
          role: "assistant",
          content:
            "Загрузка фото работает на страницах платёжных форм.\n\nОткройте, например:\n• /payments/paydocbyn\n• /payments/instant\n• /payments/paydoccur\n\nи снова прикрепите изображение — поля заполнятся через OCR.",
        });
        return;
      }
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!file.type.startsWith("image/") && !isPdf) {
        addMessage({ role: "assistant", content: "Выберите изображение (JPG, PNG) или PDF счёта." });
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        addMessage({ role: "assistant", content: "Файл слишком большой. Максимум 8 МБ." });
        return;
      }

      addMessage({ role: "user", content: `${isPdf ? "📄" : "📷"} Загружено: ${file.name}` });
      setLoading(true);

      try {
        const dataUrl = await readFileAsDataUrl(file);
        const data = await ocrFillForm(dataUrl, pageContext.form_type, sessionId);
        if (data.session_id) setSessionId(data.session_id);
        if (data.form_actions?.length) applyFormActions(data.form_actions);
        if (data.suggested_chips) setSuggestedChips(data.suggested_chips as string[]);
        if (data.character_emotion) {
          setLastEmotion(data.character_emotion as string);
          setEmotion(data.character_emotion as string);
        }
        addMessage({
          role: "assistant",
          content: data.message,
          formFillStatus: data.form_fill_status,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addMessage({
          role: "assistant",
          content: `Не удалось распознать фото.\n\n${msg}`,
        });
      } finally {
        setLoading(false);
      }
    },
    [
      addMessage,
      applyFormActions,
      isLoading,
      pageContext.form_type,
      sessionId,
      setLoading,
      setSessionId,
    ],
  );

  return (
    <div
      className={`relative flex flex-col h-full min-h-0 ${
        embedded ? "bg-transparent" : "sber-panel border-l"
      }`}
    >
      <CharacterSettings />

      <div
        className={`flex-shrink-0 relative border-b ${embedded ? "border-gray-100" : "border-sber-border"}`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sber-green via-sber-gold to-sber-green" />
        {!compactMobile && (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white border border-[#e4e8eb] text-[#7d838a] hover:text-[#008064] hover:border-[#008064]/40 flex items-center justify-center transition-colors"
            title="Настроить консультанта"
            aria-label="Настроить консультанта"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
        <AssistantCharacter
          isLoading={isLoading}
          lastAssistantText={lastAssistantText}
          compact={embedded}
          compactMobile={inputCompact}
        />
      </div>

      <div ref={scrollRef} className={`flex-1 overflow-y-auto ${compactMobile ? "p-2" : "p-4"}`}>
        {notifications.length > 0 && (
          <div className={`text-left w-full max-w-md mx-auto ${inputCompact ? "mb-2" : "mb-4"}`}>
            <NotificationBanner
              notifications={notifications}
              compact={inputCompact}
              onAsk={(n) => void sendMessage(`Расскажи про напоминание «${n.title}»`)}
            />
          </div>
        )}
        {messages.length === 0 && (
          <div
            className={`text-center px-2 ${inputCompact ? "mt-1 mb-2" : embedded ? "mt-4 px-4 text-gray-500" : "text-sber-muted mt-6 px-4"}`}
          >
            {!inputCompact && (
              <div
                className={`inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-medium ${
                  embedded
                    ? "bg-[#21A038]/10 text-[#21A038] border border-[#21A038]/20"
                    : "bg-sber-green/15 border border-sber-border text-sber-green-light"
                }`}
              >
                СберБизнес · консультант
              </div>
            )}
            <p
              className={`font-semibold mb-1 ${inputCompact ? "text-sm text-gray-900" : embedded ? "text-base text-gray-900" : "text-lg text-white"}`}
            >
              {orgName
                ? `Здравствуйте, ${orgName}!`
                : inputCompact
                  ? `Привет! Я ${config.name}.`
                  : `Здравствуйте! Я ${config.name}.`}
            </p>
            {!inputCompact && (
              <p className={`leading-relaxed ${embedded ? "text-sm text-gray-600" : "text-sm text-white/85"}`}>
                {orgName
                  ? `Я ${config.name}, ваш консультант по СберБизнес.`
                  : config.subtitle}
              </p>
            )}
            {inputCompact && (
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Помогу с платежами, выписками и разделами банка.
              </p>
            )}
            {userRole && !inputCompact && (
              <p className="text-[10px] text-sber-muted mt-2">
                Роль: {userRole === "accountant" ? "Бухгалтер" : userRole === "ip" ? "ИП" : "Бизнес"} · данные изолированы по организации
              </p>
            )}
            {messages.length === 0 && (
              <div className="mt-3 flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => void sendMessage("Сколько на счёте?")}
                  className="text-xs px-3 py-1 rounded-full border border-sber-border text-sber-green-light hover:bg-sber-green/10"
                >
                  Проверить остаток
                </button>
                <button
                  type="button"
                  onClick={() => void sendMessage("кассовый прогноз")}
                  className="text-xs px-3 py-1 rounded-full border border-sber-border text-sber-green-light hover:bg-sber-green/10"
                >
                  График прогноза
                </button>
                <button
                  type="button"
                  onClick={() => void sendMessage("расходы за 2026-03")}
                  className="text-xs px-3 py-1 rounded-full border border-sber-border text-sber-green-light hover:bg-sber-green/10"
                >
                  Диаграмма расходов
                </button>
                <button
                  type="button"
                  onClick={() => void sendMessage("сравни февраль и март")}
                  className="text-xs px-3 py-1 rounded-full border border-sber-border text-sber-green-light hover:bg-sber-green/10"
                >
                  Сравнить месяцы
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/payments/paydocbyn")}
                  className="text-xs px-3 py-1 rounded-full border border-sber-border text-sber-green-light hover:bg-sber-green/10"
                >
                  Создать платёж
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/learning")}
                  className="text-xs px-3 py-1 rounded-full bg-sber-green/15 border border-sber-green/30 text-sber-green-light hover:bg-sber-green/25 font-semibold flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Что я умею — обучение
                </button>
              </div>
            )}

            {/* Компактный ряд с графиками для mobile / embedded-чата */}
            {messages.length === 0 && inputCompact && (
              <div className="mt-3 mx-2 p-2.5 rounded-xl bg-gradient-to-br from-[#e5fcf7] to-white border border-[#107f8c]/20">
                <p className="text-[10px] font-bold text-[#107f8c] mb-1.5 uppercase tracking-wider flex items-center gap-1">
                  <span>📊</span> Графики по данным из БД
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => void sendMessage("Кассовый прогноз")}
                    className="text-left text-[11px] px-2 py-1.5 rounded-lg bg-white border border-[#e4e8eb] hover:border-[#107f8c] hover:bg-[#e5fcf7]/50 transition-colors"
                  >
                    <span className="block font-semibold text-[#1f1f22]">📈 Прогноз</span>
                    <span className="block text-[10px] text-[#7d838a]">на сколько хватит</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendMessage("Расходы за 2026-03")}
                    className="text-left text-[11px] px-2 py-1.5 rounded-lg bg-white border border-[#e4e8eb] hover:border-[#107f8c] hover:bg-[#e5fcf7]/50 transition-colors"
                  >
                    <span className="block font-semibold text-[#1f1f22]">🥧 Расходы</span>
                    <span className="block text-[10px] text-[#7d838a]">по категориям</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendMessage("Сравни февраль и март")}
                    className="text-left text-[11px] px-2 py-1.5 rounded-lg bg-white border border-[#e4e8eb] hover:border-[#107f8c] hover:bg-[#e5fcf7]/50 transition-colors"
                  >
                    <span className="block font-semibold text-[#1f1f22]">📊 Сравнить</span>
                    <span className="block text-[10px] text-[#7d838a]">два месяца</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendMessage("Сколько на счёте?")}
                    className="text-left text-[11px] px-2 py-1.5 rounded-lg bg-white border border-[#e4e8eb] hover:border-[#107f8c] hover:bg-[#e5fcf7]/50 transition-colors"
                  >
                    <span className="block font-semibold text-[#1f1f22]">💰 Счета</span>
                    <span className="block text-[10px] text-[#7d838a]">остатки по счетам</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/learning")}
                  className="mt-1.5 w-full text-[10px] font-semibold text-[#107f8c] hover:underline text-center"
                >
                  Все команды ИИ и примеры → в обучении
                </button>
              </div>
            )}
            {!embedded && !inputCompact && (
              <p className="mt-4 text-sm break-all sber-link">/payments · /statement · /salary</p>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="mb-3">
            <MessageBubble message={msg} compact={compactMobile} />
            {msg.products && msg.products.length > 0 && (
              <ProductCard products={msg.products} />
            )}
            {msg.actionButtons && msg.actionButtons.length > 0 && (
              <ActionButtons
                buttons={msg.actionButtons}
                onSendMessage={sendMessage}
                compact={compactMobile}
              />
            )}
            {msg.sources && msg.sources.length > 0 && !msg.streaming && (
              <SourceChips
                sources={msg.sources}
                onShowSource={handleShowSource}
                compact={compactMobile}
              />
            )}
            {msg.role === "assistant" &&
              msg.pendingFormFields &&
              msg.pendingFormFields.length > 0 && (
                <div
                  className={`flex gap-1.5 mt-1.5 overflow-x-auto pb-0.5 ${embedded ? "ml-0" : "ml-10"} ${compactMobile ? "flex-nowrap" : "flex-wrap"}`}
                >
                  {msg.pendingFormFields.slice(0, compactMobile ? 4 : 6).map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setInput(fieldChipPrefix[label] ?? `${label}: `)}
                      className={
                        embedded
                          ? "text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-[#d0d7dd] text-[#107f8c] hover:bg-[#e5fcf7] transition-colors whitespace-nowrap flex-shrink-0"
                          : "text-xs px-2.5 py-1 rounded-full border border-sber-border text-sber-green-light hover:bg-sber-green/10 transition-colors whitespace-nowrap flex-shrink-0"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
          </div>
        ))}

        {isLoading && !messages.some((m) => m.role === "assistant" && m.streaming) && (
          <div className="mb-3">
            <MessageBubble message={{ role: "assistant", content: "…" }} isTyping />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className={`flex-shrink-0 border-t ${embedded ? "border-gray-100" : "border-sber-border"}`}>
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onSuggestionSelect={handleSuggestionSelect}
          onPhotoSelect={handlePhotoOcr}
          showPhotoButton
          suggestions={mergedChips}
          hideSuggestions={hideSuggestions}
          highlightVoice={inputCompact}
          highlightCamera={inputCompact && Boolean(pageContext.form_type)}
          disabled={isLoading}
          compact={inputCompact}
          onVoiceComplete={sendMessage}
        />
      </div>
    </div>
  );
}
