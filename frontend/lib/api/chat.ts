import { apiClient } from "./client";
import type { ActionButton, BankProduct, NavigationStep } from "@/store/assistantStore";

export interface AssistantResponse {
  message: string;
  session_id: string;
  navigation_path?: NavigationStep[] | null;
  products?: BankProduct[] | null;
  action_buttons?: ActionButton[] | null;
}

let currentSessionId: string | null = null;

export async function sendMessage(message: string): Promise<AssistantResponse & { session_id: string }> {
  const response = await apiClient.post("/api/chat", {
    message,
    session_id: currentSessionId,
  });

  // Сохранить session_id для следующих запросов
  if (response.data.session_id) {
    currentSessionId = response.data.session_id;
  }

  return response.data;
}

export async function getChatHistory(sessionId: string) {
  const response = await apiClient.get(`/api/chat/history/${sessionId}`);
  return response.data;
}
