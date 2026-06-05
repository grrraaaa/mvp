"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { NotificationBanner } from "./NotificationBanner";
import { fetchNotifications, fetchOrgProfile, type SmartNotification } from "@/lib/api/banking";
import type { SourceRef } from "@/store/assistantStore";

interface Props {
  variant?: "default" | "embedded";
  /** Passed from floating chat on narrow screens */
  compactMobile?: boolean;
}

export function AssistantPanel({ variant = "default", compactMobile = false }: Props) {
  const [input, setInput] = useState("");
  const [orgName, setOrgName] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
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
    addMessage,
    setLoading,
    setNavigationPath,
    applyFormActions,
    setSessionId,
  } = useAssistantStore();
  const orgId = useAuthStore((s) => s.user?.org_id);
  const { config, setSettingsOpen } = useCharacterStore();
  const { speak, stop: stopSpeech } = useAssistantSpeech();
  const lastSpokenCountRef = useRef(0);

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
    void speak(last.content);
  }, [messages, isLoading, speak]);

  useEffect(() => () => stopSpeech(), [stopSpeech]);

  useEffect(() => {
    void fetchOrgProfile()
      .then((org) => setOrgName(org.org_name))
      .catch(() => setOrgName(null));
    void fetchNotifications(true)
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      const trimmed = text.trim();
      setInput("");
      addMessage({ role: "user", content: trimmed });
      setLoading(true);

      try {
        const chatPath = authHeaders().Authorization ? "/api/chat" : "/api/chat/guest";
        const res = await fetch(apiUrl(chatPath), {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            message: trimmed,
            session_id: sessionId,
            page_route: pageContext.page_route,
            form_type: pageContext.form_type,
            org_id: orgId,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.navigation_path) {
          setNavigationPath(data.navigation_path);
          const target = data.navigation_path[data.navigation_path.length - 1]?.url;
          if (target?.startsWith("/")) {
            router.push(target);
          }
        }
        if (data.session_id) setSessionId(data.session_id);
        if (data.form_actions?.length) applyFormActions(data.form_actions);
        if (data.ui_actions?.length) {
          for (const a of data.ui_actions) {
            if (a.type === "navigate" && a.target?.startsWith("/")) {
              router.push(a.target);
            } else {
              executeUiActions([a]);
            }
          }
        }

        addMessage({
          role: "assistant",
          content: data.message,
          products: data.products,
          actionButtons: data.action_buttons,
          navigationPath: data.navigation_path,
          pendingFormFields: data.pending_form_fields,
          formFillStatus: data.form_fill_status,
          sources: data.sources,
        });
      } catch (err) {
        console.error("[AssistantPanel] fetch error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        addMessage({
          role: "assistant",
          content: `Не удалось связаться с сервером.\nРазделы СберБизнес доступны в меню слева.\n\n${msg}`,
        });
      } finally {
        setLoading(false);
      }
    },
    [
      addMessage,
      applyFormActions,
      isLoading,
      pageContext,
      router,
      sessionId,
      setLoading,
      setNavigationPath,
      setSessionId,
      orgId,
    ]
  );

  const handleShowSource = useCallback(
    (source: SourceRef) => {
      void sendMessage(`Покажи источник №${source.index}`);
    },
    [sendMessage],
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
      if (!file.type.startsWith("image/")) {
        addMessage({ role: "assistant", content: "Выберите файл изображения (JPG, PNG)." });
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        addMessage({ role: "assistant", content: "Файл слишком большой. Максимум 8 МБ." });
        return;
      }

      addMessage({ role: "user", content: `📷 Загружено фото: ${file.name}` });
      setLoading(true);

      try {
        const dataUrl = await readFileAsDataUrl(file);
        const data = await ocrFillForm(dataUrl, pageContext.form_type, sessionId);
        if (data.session_id) setSessionId(data.session_id);
        if (data.form_actions?.length) applyFormActions(data.form_actions);
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
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-sber-panel-elevated border border-sber-border text-sber-muted hover:text-white hover:border-sber-green flex items-center justify-center text-sm"
            title="Настроить консультанта"
            aria-label="Настроить консультанта"
          >
            ⚙
          </button>
        )}
        <AssistantCharacter
          isLoading={isLoading}
          lastAssistantText={lastAssistantText}
          compact={embedded}
          compactMobile={inputCompact}
        />
      </div>

      <div className={`flex-1 overflow-y-auto ${compactMobile ? "p-2" : "p-4"}`}>
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
              className={`font-medium mb-0.5 ${inputCompact ? "text-xs text-gray-800" : embedded ? "text-gray-900" : "text-white"}`}
            >
              {orgName
                ? `Здравствуйте, ${orgName}!`
                : inputCompact
                  ? `Привет! Я ${config.name}.`
                  : `Здравствуйте! Я ${config.name}.`}
            </p>
            {!inputCompact && (
              <p className="text-sm">
                {orgName ? `Я ${config.name}, ваш консультант по СберБизнес.` : config.subtitle}
              </p>
            )}
            {notifications.length > 0 && (
              <div className="mt-3 text-left">
                <NotificationBanner notifications={notifications} compact={inputCompact} />
              </div>
            )}
            {!orgName && messages.length === 0 && (
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
                  onClick={() => router.push("/payments/paydocbyn")}
                  className="text-xs px-3 py-1 rounded-full border border-sber-border text-sber-green-light hover:bg-sber-green/10"
                >
                  Создать платёж
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
            {msg.sources && msg.sources.length > 0 && (
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

        {isLoading && (
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
          onSuggestionSelect={sendMessage}
          onPhotoSelect={handlePhotoOcr}
          showPhotoButton
          suggestions={quickChips}
          hideSuggestions={false}
          disabled={isLoading}
          compact={inputCompact}
          onVoiceComplete={sendMessage}
        />
      </div>
    </div>
  );
}
