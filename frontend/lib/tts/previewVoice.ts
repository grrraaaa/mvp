/** Превью TTS-голоса: воспроизводит sample-фразу конкретным voiceId
 *  без побочных эффектов на ttsStore / lip-sync. Используется в UI
 *  персонализации, чтобы пользователь мог «послушать» голос до выбора.
 *
 *  Стратегия:
 *  1. POST /api/tts/synthesize (или fetchAssistantSpeech) с конкретным voiceId
 *  2. Если бэкенд недоступен / упал — fallback на Web Speech API
 *  3. Ошибка логируется, но не пробрасывается — превью не должно ломать UX
 */
import { fetchAssistantSpeech } from "@/lib/api/tts";
import { isBrowserSpeechAvailable, speakWithBrowserSpeech } from "./browserSpeech";

export const PREVIEW_PHRASE = "Привет! Я ваш виртуальный ассистент Сбер Бизнес.";

export interface PreviewHandle {
  /** Promise, который резолвится когда превью закончилось (или было прервано). */
  done: Promise<void>;
  /** Прервать воспроизведение. */
  stop: () => void;
}

/** Запустить превью голоса. Можно вызвать повторно — предыдущее превью
 *  того же voiceId (или любое активное) будет остановлено. */
export function previewVoiceSample(voiceId: string, text = PREVIEW_PHRASE): PreviewHandle {
  // Ячейка для `resolve` Promise'а — заполняется синхронно в конструкторе ниже.
  const resolveRef: { fn: (() => void) | null } = { fn: null };

  let audio: HTMLAudioElement | null = null;

  const done = new Promise<void>((resolve) => {
    resolveRef.fn = resolve;
  });

  const stopFn = () => {
    try {
      audio?.pause();
    } catch {
      /* noop */
    }
    try {
      speechSynthesis?.cancel();
    } catch {
      /* noop */
    }
    resolveRef.fn?.();
  };

  // Канселлим любую активную браузерную озвучку, чтобы не накладывалось.
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* noop */
    }
  }

  void (async () => {
    try {
      const blob = await fetchAssistantSpeech(text, voiceId);
      if (typeof window === "undefined") return;
      const url = URL.createObjectURL(blob);
      audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolveRef.fn?.();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolveRef.fn?.();
      };
      await audio.play();
    } catch {
      // Бэкенд упал — пробуем браузер.
      if (isBrowserSpeechAvailable()) {
        try {
          await speakWithBrowserSpeech(text, voiceId);
        } catch {
          /* noop */
        }
      }
      resolveRef.fn?.();
    }
  })();

  return { done, stop: stopFn };
}
