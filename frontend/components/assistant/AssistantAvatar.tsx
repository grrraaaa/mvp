"use client";

import type { CSSProperties } from "react";
import type { AssistantCharacterConfig } from "@/lib/assistant/characterTypes";

interface Props {
  config: AssistantCharacterConfig;
  size?: "sm" | "md";
  className?: string;
}

const SIZES = { sm: 32, md: 48 } as const;

export function AssistantAvatar({ config, size = "sm", className = "" }: Props) {
  const px = SIZES[size];
  const style = {
    width: px,
    height: px,
    background: `linear-gradient(145deg, ${config.primaryColor}, ${config.skinTone})`,
    fontSize: px * 0.42,
  } as CSSProperties;

  return (
    <div
      className={`rounded-full flex items-center justify-center shadow-md border border-white/10 ${className}`}
      style={style}
      aria-hidden
    >
      {config.emoji}
    </div>
  );
}
