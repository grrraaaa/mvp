import { fetchAssistantSpeech } from "@/lib/api/tts";
import { playTtsBlob, stopTtsPlayback } from "@/lib/tts/playback";

export function previewPhraseForVoice(): string {
  return "Привет! Я ваш виртуальный ассистент Сбер Бизнес.";
}

export async function prefetchSpeech(text: string, voiceId: string): Promise<Blob> {
  const trimmed = text.trim();
  if (!trimmed || !voiceId.trim()) {
    throw new Error("TTS: пустой текст или голос");
  }
  return fetchAssistantSpeech(trimmed, voiceId);
}

export async function playPreparedSpeech(blob: Blob, text: string): Promise<void> {
  stopTtsPlayback();
  await playTtsBlob(blob, text.trim());
}

export async function speakWithVoice(text: string, voiceId: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed || !voiceId.trim()) return;

  const blob = await prefetchSpeech(trimmed, voiceId);
  await playPreparedSpeech(blob, trimmed);
}
