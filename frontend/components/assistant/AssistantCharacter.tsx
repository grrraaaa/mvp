"use client";

import dynamic from "next/dynamic";
import { useCharacterStore } from "@/store/characterStore";

const CharacterRoomScene = dynamic(
  () =>
    import("./character3d/CharacterRoomScene").then((m) => m.CharacterRoomScene),
  { ssr: false, loading: () => <CharacterStageFallback /> }
);

function CharacterStageFallback() {
  const { config } = useCharacterStore();
  return (
    <div
      className="w-full h-[380px] sm:h-[520px] border-b border-white/10 flex items-center justify-center"
      style={{
        background: `radial-gradient(ellipse at 50% 100%, ${config.primaryColor}44, #0b1220)`,
      }}
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
