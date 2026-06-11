/** Puter.js v2 — client-side TTS (https://js.puter.com/v2/) */
interface PuterTxt2Speech {
  (text: string, language: string): Promise<HTMLAudioElement>;
  (text: string, options: Record<string, unknown>): Promise<HTMLAudioElement>;
}

interface PuterAI {
  txt2speech: PuterTxt2Speech;
}

interface PuterGlobal {
  ai: PuterAI;
}

interface Window {
  puter?: PuterGlobal;
}
