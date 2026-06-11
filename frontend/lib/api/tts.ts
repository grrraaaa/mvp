import { apiUrl } from "@/lib/api/baseUrl";
import type { TtsVoiceGroup } from "@/store/ttsStore";

export interface TtsStatus {
  enabled: boolean;
  model: string;
  provider: string | null;
  providers?: string[];
  puter_available?: boolean;
  inworld_available?: boolean;
  voice?: string | null;
  voice_selection?: boolean;
  /** Какие провайдеры сконфигурированы на бэке. UI показывает баннер,
   *  если какого-то не хватает. Edge — бесплатный, не упоминается. */
  google_available?: boolean;
  qwen_available?: boolean;
}

export interface TtsVoicesResponse {
  default_voice: string;
  model: string;
  language: string;
  groups: TtsVoiceGroup[];
}

export async function fetchTtsStatus(): Promise<TtsStatus> {
  const res = await fetch(apiUrl("/api/tts/status"), { credentials: "same-origin" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<TtsStatus>;
}

export async function fetchTtsVoices(): Promise<TtsVoicesResponse> {
  const res = await fetch(apiUrl("/api/tts/voices"), { credentials: "same-origin" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = typeof data.detail === "string" ? data.detail : `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return res.json() as Promise<TtsVoicesResponse>;
}

const TTS_FETCH_TIMEOUT_MS = 12_000;

export async function fetchAssistantSpeech(
  text: string,
  voiceId?: string | null,
): Promise<Blob> {
  const body: { text: string; voice_id?: string } = { text };
  if (voiceId) body.voice_id = voiceId;

  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TTS_FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(apiUrl("/api/tts/speak"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err) {
    if (ctrl.signal.aborted) {
      throw new Error("TTS_TIMEOUT");
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = typeof data.detail === "string" ? data.detail : `HTTP ${res.status}`;
    throw new Error(detail);
  }

  return res.blob();
}
