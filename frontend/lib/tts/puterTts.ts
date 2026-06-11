/** Client-side TTS via Puter.js — https://js.puter.com/v2/ */

const PUTER_SCRIPT_URL = "https://js.puter.com/v2/";

let scriptPromise: Promise<void> | null = null;

export function loadPuterScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.puter?.ai?.txt2speech) return Promise.resolve();

  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PUTER_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Puter script failed")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = PUTER_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Не удалось загрузить Puter.js"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function puterTextToSpeech(
  text: string,
  language: string,
): Promise<HTMLAudioElement> {
  await loadPuterScript();
  if (!window.puter?.ai?.txt2speech) {
    throw new Error("Puter TTS недоступен");
  }
  const audio = await window.puter.ai.txt2speech(text.trim(), language);
  if (!audio || typeof audio.play !== "function") {
    throw new Error("Puter вернул некорректный аудио-объект");
  }
  return audio;
}
