import { apiUrl } from "@/lib/api/baseUrl";
import { authHeaders } from "@/lib/auth/tokenRef";
import type { ChatMessage } from "@/store/assistantStore";

export interface ChatSessionSummary {
  session_id: string;
  title: string;
  preview: string;
  message_count: number;
  created_at: string | null;
  is_guest: boolean;
}

export async function fetchChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const res = await fetch(apiUrl(`/api/chat/history/${sessionId}`), {
    credentials: "same-origin",
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.messages ?? []) as ChatMessage[];
}

export async function fetchChatSessions(limit = 50): Promise<ChatSessionSummary[]> {
  const res = await fetch(apiUrl(`/api/chat/sessions?limit=${limit}`), {
    credentials: "same-origin",
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.sessions ?? []) as ChatSessionSummary[];
}

export async function streamChatMessage(
  body: Record<string, unknown>,
  onToken: (partial: string) => void,
): Promise<Record<string, unknown>> {
  const authed = Boolean(authHeaders().Authorization);
  const path = authed ? "/api/chat/stream" : "/api/chat/guest/stream";
  const res = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No stream body");
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: Record<string, unknown> | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const json = line.slice(5).trim();
      try {
        const payload = JSON.parse(json) as Record<string, unknown>;
        if (payload.done) {
          finalPayload = payload;
        } else if (typeof payload.partial === "string") {
          onToken(payload.partial);
        }
      } catch {
        /* skip malformed */
      }
    }
  }
  if (!finalPayload) throw new Error("Stream ended without payload");
  return finalPayload;
}
