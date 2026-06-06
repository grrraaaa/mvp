"use client";

import { useTtsBootstrap } from "@/hooks/useTtsBootstrap";

/** Подгружает статус TTS и голоса при входе в банк (до открытия чата). */
export function TtsBootstrap() {
  useTtsBootstrap();
  return null;
}
