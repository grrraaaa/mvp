"use client";

import { Html } from "@react-three/drei";

interface Props {
  text: string;
  visible: boolean;
  anchorY?: number;
  /** false — только lip-sync / 3D-рот, без белого облака с текстом */
  showText?: boolean;
}

export function SpeechBubble3D({
  text,
  visible,
  anchorY = 2.15,
  showText = true,
}: Props) {
  if (!visible || !text || !showText) return null;

  return (
    <Html
      position={[0, anchorY, 0.08]}
      center
      distanceFactor={5.5}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div className="relative max-w-[210px] px-3 py-2 rounded-2xl rounded-bl-sm bg-white text-gray-900 text-xs leading-snug shadow-lg border border-sber-green/30">
        <p>{text}</p>
        <div
          className="absolute -bottom-1.5 left-4 w-3 h-3 bg-white rotate-45 border-r border-b border-sber-green/30"
          aria-hidden
        />
      </div>
    </Html>
  );
}
