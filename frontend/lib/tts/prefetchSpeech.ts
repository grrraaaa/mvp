import { prefetchSpeech } from "@/lib/tts/voiceProvider";

export const TTS_PREFETCH_TIMEOUT_MS = 10_000;

export interface PrefetchSpeechResult {
  blob: Blob | null;
  timedOut: boolean;
  error: string | null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(() => {
      reject(new Error("TTS_TIMEOUT"));
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    promise
      .then((value) => {
        window.clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(err);
      });
  });
}

/** Загрузить MP3 озвучки целиком или вернуть ошибку / таймаут 10 с. */
export async function prefetchSpeechWithTimeout(
  text: string,
  voiceId: string,
  options?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<PrefetchSpeechResult> {
  const timeoutMs = options?.timeoutMs ?? TTS_PREFETCH_TIMEOUT_MS;
  try {
    const blob = await withTimeout(
      prefetchSpeech(text, voiceId),
      timeoutMs,
      options?.signal,
    );
    return { blob, timedOut: false, error: null };
  } catch (err) {
    if (options?.signal?.aborted) {
      return { blob: null, timedOut: false, error: "aborted" };
    }
    if (err instanceof Error && err.message === "TTS_TIMEOUT") {
      return { blob: null, timedOut: true, error: "timeout" };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { blob: null, timedOut: false, error: message };
  }
}
