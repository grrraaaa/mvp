function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(resolve, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export interface RevealTextOptions {
  charDelayMs?: number;
  signal?: AbortSignal;
}

/** Постепенно «печатает» текст в UI. */
export async function revealTextGradually(
  fullText: string,
  onUpdate: (visible: string) => void,
  options?: RevealTextOptions,
): Promise<void> {
  const baseDelay = options?.charDelayMs ?? 34;
  let visible = "";

  for (const ch of fullText) {
    visible += ch;
    onUpdate(visible);

    const delay =
      ch === "\n" ? baseDelay * 2.2 : ch === " " ? baseDelay * 0.35 : baseDelay;
    try {
      await sleep(delay, options?.signal);
    } catch {
      break;
    }
  }

  if (!options?.signal?.aborted) {
    onUpdate(fullText);
  }
}

/** Задержка между символами под длительность озвучки. */
export function charDelayForSpeech(text: string, durationMs: number): number {
  const len = Math.max(text.trim().length, 1);
  return Math.min(52, Math.max(22, durationMs / len));
}
