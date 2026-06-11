import { fetchAssistantSpeech } from "@/lib/api/tts";
import { playTtsBlob, stopTtsPlayback } from "@/lib/tts/playback";

export function previewPhraseForVoice(): string {
  return "Привет! Я ваш виртуальный ассистент Сбер Бизнес.";
}

export async function speakWithVoice(text: string, voiceId: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed || !voiceId.trim()) return;

  stopTtsPlayback();
  const blob = await fetchAssistantSpeech(trimmed, voiceId);
  await playTtsBlob(blob, trimmed);
}
