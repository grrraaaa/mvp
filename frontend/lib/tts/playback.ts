/** Shared TTS playback so mute/stop works across all assistant UI instances. */

let audioRef: HTMLAudioElement | null = null;
let objectUrlRef: string | null = null;

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
}

export async function playTtsBlob(blob: Blob): Promise<void> {
  stopTtsPlayback();
  const url = URL.createObjectURL(blob);
  objectUrlRef = url;
  const audio = new Audio(url);
  audioRef = audio;
  audio.onended = () => {
    if (objectUrlRef === url) {
      URL.revokeObjectURL(url);
      objectUrlRef = null;
    }
    if (audioRef === audio) audioRef = null;
  };
  await audio.play();
}
