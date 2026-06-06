/** Shared TTS playback with lip-sync callbacks. */

let audioRef: HTMLAudioElement | null = null;
let objectUrlRef: string | null = null;
let lipSyncListeners: Array<(openness: number, speaking: boolean) => void> = [];

export function onTtsLipSync(cb: (openness: number, speaking: boolean) => void): () => void {
  lipSyncListeners.push(cb);
  return () => {
    lipSyncListeners = lipSyncListeners.filter((x) => x !== cb);
  };
}

function emitLipSync(openness: number, speaking: boolean) {
  for (const cb of lipSyncListeners) cb(openness, speaking);
}

export function stopTtsPlayback(): void {
  if (audioRef) {
    audioRef.pause();
    audioRef.currentTime = 0;
    audioRef = null;
  }
  if (objectUrlRef) {
    URL.revokeObjectURL(objectUrlRef);
    objectUrlRef = null;
  }
  if (typeof window !== "undefined") {
    window.speechSynthesis?.cancel();
  }
  emitLipSync(0, false);
}

export async function playTtsBlob(blob: Blob, text?: string): Promise<void> {
  stopTtsPlayback();
  const url = URL.createObjectURL(blob);
  objectUrlRef = url;
  const audio = new Audio(url);
  audioRef = audio;

  let raf = 0;
  const tick = () => {
    if (!audioRef || audioRef !== audio || audio.paused) {
      emitLipSync(0, false);
      return;
    }
    const dur = audio.duration || 1;
    const t = audio.currentTime / dur;
    const charIdx = Math.floor((text?.length ?? 40) * t);
    const ch = text?.[charIdx] ?? "а";
    const vowel = /[aeiouyаеёиоуыэюя]/i.test(ch);
    const openness = vowel ? 0.55 + Math.sin(t * 40) * 0.25 : 0.15 + Math.sin(t * 35) * 0.1;
    emitLipSync(Math.min(1, Math.max(0, openness)), true);
    raf = requestAnimationFrame(tick);
  };

  audio.onplay = () => {
    emitLipSync(0.2, true);
    raf = requestAnimationFrame(tick);
  };
  audio.onended = () => {
    cancelAnimationFrame(raf);
    emitLipSync(0, false);
    if (objectUrlRef === url) {
      URL.revokeObjectURL(url);
      objectUrlRef = null;
    }
    if (audioRef === audio) audioRef = null;
  };
  await audio.play();
}
