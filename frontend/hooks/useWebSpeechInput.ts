"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type VoiceStatusKind = "idle" | "listening" | "success" | "error";

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export interface UseWebSpeechInputOptions {
  /** Called when recognition ends successfully — send to assistant without pressing Enter */
  onComplete?: (text: string) => void;
  disabled?: boolean;
}

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function voiceErrorMessage(error: string): string {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Нет доступа к микрофону. Разрешите доступ в настройках браузера.";
  }
  if (error === "no-speech") {
    return "Речь не распознана. Попробуйте ещё раз.";
  }
  if (error === "audio-capture") {
    return "Микрофон не найден или занят другим приложением.";
  }
  if (error === "network") {
    return "Не удалось подключить распознавание речи. Проверьте сеть.";
  }
  return "Голосовой ввод сейчас недоступен. Попробуйте ввести текст вручную.";
}

export function useWebSpeechInput(
  onTranscript: (text: string) => void,
  options: UseWebSpeechInputOptions = {},
) {
  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<VoiceStatusKind>("idle");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseValueRef = useRef("");
  const spokenFinalRef = useRef("");
  const interimRef = useRef("");
  const lastErrorRef = useRef(false);
  /** Push-to-talk: при ручном stop() мы сами шлём накопленное и скипаем
   *  авто-отправку в onend (иначе будет дубль). */
  const suppressOnEndRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onCompleteRef = useRef(options.onComplete);
  const disabledRef = useRef(options.disabled);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onCompleteRef.current = options.onComplete;
    disabledRef.current = options.disabled;
  }, [options.onComplete, options.disabled]);

  useEffect(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setSupported(false);
      return;
    }

    setSupported(true);
    const recognition = new Ctor();
    recognition.lang = "ru-RU";
    recognition.interimResults = true;
    /** continuous=true, чтобы запись шла пока юзер держит кнопку/M, а не
     *  обрывалась через секунду тишины. Сами останавливаем через stop(). */
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      lastErrorRef.current = false;
      spokenFinalRef.current = "";
      interimRef.current = "";
      setIsListening(true);
      setStatusKind("listening");
      setStatus("Слушаю… отпустите, чтобы отправить.");
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        if (!transcript) continue;
        if (event.results[i].isFinal) {
          finalText += (finalText ? " " : "") + transcript;
        } else {
          interimText += (interimText ? " " : "") + transcript;
        }
      }

      interimRef.current = interimText;
      if (finalText) {
        spokenFinalRef.current = baseValueRef.current
          ? `${baseValueRef.current} ${finalText}`.trim()
          : finalText.trim();
      }

      const preview = (spokenFinalRef.current || finalText || interimText).trim();
      const combined = preview
        ? baseValueRef.current
          ? `${baseValueRef.current} ${preview}`.trim()
          : preview
        : baseValueRef.current;

      if (combined) {
        onTranscriptRef.current(combined);
      }
    };

    recognition.onerror = (event) => {
      lastErrorRef.current = true;
      setStatusKind("error");
      setStatus(voiceErrorMessage(event.error));
    };

    recognition.onend = () => {
      setIsListening(false);
      if (lastErrorRef.current) {
        lastErrorRef.current = false;
        spokenFinalRef.current = "";
        interimRef.current = "";
        return;
      }
      if (suppressOnEndRef.current) {
        suppressOnEndRef.current = false;
        spokenFinalRef.current = "";
        interimRef.current = "";
        return;
      }

      const text = spokenFinalRef.current.trim();
      spokenFinalRef.current = "";
      interimRef.current = "";

      if (text && onCompleteRef.current && !disabledRef.current) {
        setStatusKind("listening");
        setStatus("Отправляю…");
        onCompleteRef.current(text);
        setStatusKind("idle");
        setStatus("");
        return;
      }

      setStatusKind("success");
      setStatus(text ? "Готово." : "");
      window.setTimeout(() => {
        setStatusKind("idle");
        setStatus("");
      }, 1200);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  /** Push-to-talk: явный старт записи. */
  const startListening = useCallback(
    (baseValue?: string) => {
      const recognition = recognitionRef.current;
      if (!recognition) return false;
      if (isListening) return true;

      baseValueRef.current = (baseValue ?? "").trim();
      spokenFinalRef.current = "";
      interimRef.current = "";
      lastErrorRef.current = false;
      suppressOnEndRef.current = false;
      setStatusKind("listening");
      setStatus("Запрашиваю доступ к микрофону...");

      try {
        recognition.start();
        return true;
      } catch {
        setStatusKind("error");
        setStatus("Микрофон уже запускается. Попробуйте ещё раз.");
        return false;
      }
    },
    [isListening],
  );

  /** Push-to-talk: явный стоп + отправка накопленного текста.
   *  Всегда вызываем `recognition.stop()` (с try/catch), даже если
   *  `isListening` в замыкании ещё `false` — иначе при pointerup сразу после
   *  pointerdown, когда onstart не успел пробросить state в React, микрофон
   *  остаётся включённым. */
  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    // Снимем то, что есть прямо сейчас (final + interim) и пошлём руками,
    // чтобы onend с continuous=true не «потерял» последний кусок.
    const finalTxt = spokenFinalRef.current.trim();
    const interimTxt = interimRef.current.trim();
    const text = (finalTxt + (interimTxt ? " " + interimTxt : "")).trim();

    suppressOnEndRef.current = true;

    try {
      recognition.stop();
    } catch {
      /* recognition не был запущен — ок, ничего не делаем */
    }

    if (text && onCompleteRef.current && !disabledRef.current) {
      setStatusKind("listening");
      setStatus("Отправляю…");
      onCompleteRef.current(text);
      window.setTimeout(() => {
        setStatusKind("idle");
        setStatus("");
      }, 400);
    } else {
      setStatusKind("idle");
      setStatus("");
    }
    spokenFinalRef.current = "";
    interimRef.current = "";
    setIsListening(false);
  }, []);

  /** Tap-to-toggle: для пользователей без мыши/клавиатуры (a11y). */
  const toggleListening = useCallback(
    (currentValue: string) => {
      if (isListening) {
        stopListening();
      } else {
        startListening(currentValue);
      }
    },
    [isListening, startListening, stopListening],
  );

  const clearStatus = useCallback(() => {
    setStatus("");
    setStatusKind("idle");
  }, []);

  return {
    supported,
    isListening,
    status,
    statusKind,
    startListening,
    stopListening,
    toggleListening,
    clearStatus,
  };
}
