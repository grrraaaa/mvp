"use client";

import { useEffect, useRef } from "react";
import {
  RARE_WALK_CHANCE,
  useCharacterBehaviorStore,
} from "@/store/characterBehaviorStore";
import { useModelCapabilitiesStore } from "@/store/modelCapabilitiesStore";

interface Options {
  isLoading: boolean;
  lastAssistantText: string | null;
}

function speechDurationMs(text: string): number {
  return Math.min(12000, Math.max(3200, text.length * 62));
}

function toSnippet(text: string): string {
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

export function useCharacterBehavior({ isLoading, lastAssistantText }: Options) {
  const {
    setAction,
    setSpeech,
    startTalk,
    beginRareApproach,
    finishTalk,
  } = useCharacterBehaviorStore();
  const isStaticMesh = useModelCapabilitiesStore((s) => s.isStaticMesh);
  const headPortraitMode = useModelCapabilitiesStore((s) => s.headPortraitMode);

  const lastSpokenRef = useRef<string | null>(null);
  const talkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAction("idle");
  }, [setAction]);

  useEffect(() => {
    if (isLoading) {
      if (talkTimerRef.current) clearTimeout(talkTimerRef.current);
      setSpeech(null);
      setAction("think");
      return;
    }

    if (!lastAssistantText || lastAssistantText === lastSpokenRef.current) {
      return;
    }

    lastSpokenRef.current = lastAssistantText;
    const snippet = toSnippet(lastAssistantText);
    const duration = speechDurationMs(snippet);

    const allowWalk =
      !headPortraitMode && !isStaticMesh && Math.random() < RARE_WALK_CHANCE;

    if (allowWalk) {
      beginRareApproach(snippet, duration);
    } else {
      startTalk(snippet, duration);
    }

    talkTimerRef.current = setTimeout(() => finishTalk(), duration);

    return () => {
      if (talkTimerRef.current) clearTimeout(talkTimerRef.current);
    };
  }, [
    isLoading,
    lastAssistantText,
    isStaticMesh,
    headPortraitMode,
    setAction,
    setSpeech,
    startTalk,
    beginRareApproach,
    finishTalk,
  ]);
}
