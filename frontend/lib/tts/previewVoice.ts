/** Превью голоса (Inworld, сервер). */
import { stopTtsPlayback } from "@/lib/tts/playback";
import { previewPhraseForVoice, speakWithVoice } from "@/lib/tts/voiceProvider";

export interface PreviewHandle {
  done: Promise<void>;
  stop: () => void;
}

export function previewVoiceSample(voiceId: string, text?: string): PreviewHandle {
  const resolveRef: { fn: (() => void) | null } = { fn: null };

  const done = new Promise<void>((resolve) => {
    resolveRef.fn = resolve;
  });

  const stopFn = () => {
    stopTtsPlayback();
    resolveRef.fn?.();
  };

  void (async () => {
    try {
      const phrase = text ?? previewPhraseForVoice();
      await speakWithVoice(phrase, voiceId);
    } catch {
      /* preview failed */
    } finally {
      resolveRef.fn?.();
    }
  })();

  return { done, stop: stopFn };
}
