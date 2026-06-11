/** Превью языка озвучки Puter.js. */
import { playTtsElement, stopTtsPlayback } from "@/lib/tts/playback";
import { puterTextToSpeech } from "@/lib/tts/puterTts";
import { puterPreviewPhrase } from "@/lib/tts/puterVoices";

export interface PreviewHandle {
  done: Promise<void>;
  stop: () => void;
}

export function previewVoiceSample(languageId: string, text?: string): PreviewHandle {
  const resolveRef: { fn: (() => void) | null } = { fn: null };
  let activeAudio: HTMLAudioElement | null = null;

  const done = new Promise<void>((resolve) => {
    resolveRef.fn = resolve;
  });

  const stopFn = () => {
    stopTtsPlayback();
    activeAudio = null;
    resolveRef.fn?.();
  };

  void (async () => {
    try {
      const phrase = text ?? puterPreviewPhrase(languageId);
      const audio = await puterTextToSpeech(phrase, languageId);
      activeAudio = audio;
      audio.onended = () => resolveRef.fn?.();
      audio.onerror = () => resolveRef.fn?.();
      await playTtsElement(audio, phrase);
    } catch {
      resolveRef.fn?.();
    }
  })();

  return { done, stop: stopFn };
}
