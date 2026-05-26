"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ProductCard } from "./ProductCard";
import { ActionButtons } from "./ActionButtons";
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
    </div>
  );
}
