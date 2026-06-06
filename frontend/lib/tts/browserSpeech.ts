/** Клиентский fallback: Web Speech API (без API-ключей, голоса зависят от ОС/браузера). */

const EDGE_MALE = "ru-RU-DmitryNeural";
const EDGE_FEMALE = "ru-RU-SvetlanaNeural";

function pickRussianVoice(gender: "male" | "female"): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const ru = voices.filter((v) => v.lang.toLowerCase().startsWith("ru"));
  if (!ru.length) return null;

  const wantFemale = gender === "female";
  const byGender = ru.filter((v) => {
    const name = v.name.toLowerCase();
    const femaleHint = /female|жен|svetlana|irina|elena|anna|milena|dariya/i.test(name);
    const maleHint = /male|муж|dmitry|pavel|yuri|maxim|nikolai/i.test(name);
    if (wantFemale) return femaleHint || !maleHint;
    return maleHint || !femaleHint;
  });

  return (byGender[0] ?? ru[0]) ?? null;
}

function voiceGenderFromId(voiceId: string | null | undefined): "male" | "female" {
  if (voiceId === EDGE_FEMALE) return "female";
  if (
    voiceId === "qwen-female" ||
    voiceId?.includes("Wavenet-A") ||
    voiceId?.includes("Svetlana")
  ) {
    return "female";
  }
  return "male";
}

export function isBrowserSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakWithBrowserSpeech(
  text: string,
  voiceId?: string | null,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isBrowserSpeechAvailable()) {
      reject(new Error("Web Speech API недоступен"));
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ru-RU";
    utterance.rate = 1;

    const gender = voiceGenderFromId(voiceId);
    const browserVoice = pickRussianVoice(gender);
    if (browserVoice) utterance.voice = browserVoice;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      if (e.error === "canceled") {
        resolve();
        return;
      }
      reject(new Error(e.error || "speechSynthesis error"));
    };

    const start = () => synth.speak(utterance);
    const voices = synth.getVoices();
    if (voices.length) {
      start();
    } else {
      synth.onvoiceschanged = () => {
        synth.onvoiceschanged = null;
        const refreshed = pickRussianVoice(gender);
        if (refreshed) utterance.voice = refreshed;
        start();
      };
      start();
    }
  });
}
