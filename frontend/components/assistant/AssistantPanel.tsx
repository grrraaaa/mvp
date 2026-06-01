"use client";

<<<<<<< HEAD
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
=======
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ProductCard } from "./ProductCard";
import { ActionButtons } from "./ActionButtons";
<<<<<<< HEAD
import { AssistantCharacter } from "./AssistantCharacter";
import { CharacterSettings } from "./CharacterSettings";
import { useAssistantStore } from "@/store/assistantStore";
import { useCharacterStore } from "@/store/characterStore";
import { getSbbolPageContext, isPaymentFormRoute } from "@/lib/sbbol/formContext";
import { getAssistantQuickChips } from "@/lib/sbbol/assistantQuickChips";
import { ocrFillForm, readFileAsDataUrl } from "@/lib/api/forms";
import { apiUrl } from "@/lib/api/baseUrl";

interface Props {
  variant?: "default" | "embedded";
  /** Passed from floating chat on narrow screens */
  compactMobile?: boolean;
}

export function AssistantPanel({ variant = "default", compactMobile = false }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const pageContext = useMemo(() => getSbbolPageContext(pathname), [pathname]);
  const quickChips = useMemo(
    () => getAssistantQuickChips(pathname, { mobile: compactMobile }),
    [pathname, compactMobile],
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
  const { config, setSettingsOpen } = useCharacterStore();

  const lastAssistantText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].content;
    }
    return null;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      const trimmed = text.trim();
      setInput("");
      addMessage({ role: "user", content: trimmed });
      setLoading(true);

      try {
        const res = await fetch(apiUrl("/api/chat/guest"), {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            session_id: sessionId,
            page_route: pageContext.page_route,
            form_type: pageContext.form_type,
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

        addMessage({
          role: "assistant",
          content: data.message,
          products: data.products,
          actionButtons: data.action_buttons,
          navigationPath: data.navigation_path,
          pendingFormFields: data.pending_form_fields,
          formFillStatus: data.form_fill_status,
        });
      } catch (err) {
        console.error("[AssistantPanel] fetch error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        addMessage({
          role: "assistant",
          content: `Не удалось связаться с сервером.\nОфициальный сайт:\nhttps://www.sber-bank.by\n\n${msg}`,
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
    ]
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
      if (!pageContext.form_type || isLoading) return;
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

  const embedded = variant === "embedded";
  const showPhotoOcr = isPaymentFormRoute(pathname);

  return (
    <div
      className={`relative flex flex-col h-full min-h-0 ${
        embedded ? "bg-transparent" : "sber-panel border-l"
      }`}
    >
      <CharacterSettings />

      <div className={`flex-shrink-0 relative border-b ${embedded ? "border-gray-100" : "border-sber-border"}`}>
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
          compactMobile={compactMobile}
        />
      </div>

      <div className={`flex-1 overflow-y-auto ${compactMobile ? "p-2" : "p-4"}`}>
        {messages.length === 0 && (
          <div
            className={`text-center px-2 ${compactMobile ? "mt-1" : embedded ? "mt-4 px-4 text-gray-500" : "text-sber-muted mt-6 px-4"}`}
          >
            {!compactMobile && (
              <div
                className={`inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-medium ${
                  embedded
                    ? "bg-[#21A038]/10 text-[#21A038] border border-[#21A038]/20"
                    : "bg-sber-green/15 border border-sber-border text-sber-green-light"
                }`}
              >
                Сбер Банк · консультант
              </div>
            )}
            <p
              className={`font-medium mb-0.5 ${compactMobile ? "text-xs text-gray-800" : embedded ? "text-gray-900" : "text-white"}`}
            >
              {compactMobile ? `Привет! Я ${config.name}.` : `Здравствуйте! Я ${config.name}.`}
            </p>
            {!compactMobile && <p className="text-sm">{config.subtitle}</p>}
            {!embedded && !compactMobile && (
              <p className="mt-4 text-sm break-all sber-link">https://www.sber-bank.by</p>
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
          onPhotoSelect={showPhotoOcr ? handlePhotoOcr : undefined}
          showPhotoButton={showPhotoOcr}
          suggestions={quickChips}
          disabled={isLoading}
          compact={compactMobile}
        />
      </div>
=======
import { useAssistantStore } from "@/store/assistantStore";
import { sendMessage } from "@/lib/api/chat";

export function AssistantPanel() {
  const [input, setInput] = useState("");
  const { messages, isLoading, addMessage, setLoading, setNavigationPath } =
    useAssistantStore();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Добавить сообщение пользователя
    addMessage({ role: "user", content: userMessage });
    setLoading(true);

    try {
      const response = await sendMessage(userMessage);

      // Обновить состояние навигации для 3D-сцены
      if (response.navigation_path) {
        setNavigationPath(response.navigation_path);
      }

      // Добавить ответ ассистента
      addMessage({
        role: "assistant",
        content: response.message,
        products: response.products,
        actionButtons: response.action_buttons,
        navigationPath: response.navigation_path,
      });
    } catch (error) {
      addMessage({
        role: "assistant",
        content: "Произошла ошибка. Попробуйте ещё раз.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/80 backdrop-blur-xl border-l border-white/10">
      {/* Заголовок */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg">
            🤖
          </div>
          <div>
            <h2 className="font-semibold">SberAI Ассистент</h2>
            <p className="text-xs text-gray-400">Помогу найти нужную услугу</p>
          </div>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-4xl mb-3">👋</p>
            <p>Привет! Спросите меня о любой услуге банка.</p>
            <p className="text-sm mt-1">Например: «Где взять кредит под 5%?»</p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageBubble message={msg} />
              {msg.products && <ProductCard products={msg.products} />}
              {msg.actionButtons && <ActionButtons buttons={msg.actionButtons} />}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <div className="flex gap-1 p-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-blue-400 rounded-full"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Поле ввода */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={isLoading}
      />
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
    </div>
  );
}
