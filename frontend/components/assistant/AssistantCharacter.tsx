"use client";

import dynamic from "next/dynamic";
import { ASSISTANT_SURFACE } from "@/lib/assistant/assistantSurface";

const CharacterRoomScene = dynamic(
  () =>
    import("./character3d/CharacterRoomScene").then((m) => m.CharacterRoomScene),
  { ssr: false, loading: () => <CharacterStageFallback /> }
);

function CharacterStageFallback() {
  return (
    <div
      className="w-full h-[380px] sm:h-[520px] border-b border-assistant-surface-border flex items-center justify-center bg-assistant-surface"
      style={{ backgroundColor: ASSISTANT_SURFACE }}
    >
      <span className="text-gray-500 text-sm animate-pulse">Загрузка 3D…</span>
    </div>
  );
}

interface Props {
  isLoading: boolean;
  lastAssistantText: string | null;
  compact?: boolean;
  compactMobile?: boolean;
}

export function AssistantCharacter({ isLoading, lastAssistantText, compact, compactMobile }: Props) {
  return (
    <CharacterRoomScene
      isLoading={isLoading}
      lastAssistantText={lastAssistantText}
      compact={compact}
      compactMobile={compactMobile}
    />
  );
}
