"use client";

import { Suspense } from "react";
import type { AssistantCharacterConfig } from "@/lib/assistant/characterTypes";
import { DEFAULT_GLB_PATH } from "@/lib/assistant/glbCharacter";
import { resolveModelPath, useCharacterStore } from "@/store/characterStore";
import { GlbCharacter3D } from "./GlbCharacter3D";
import { Humanoid3D } from "./Humanoid3D";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { ModelLoadingPlaceholder } from "./ModelLoadingPlaceholder";

interface Props {
  config: AssistantCharacterConfig;
}

function ProceduralFallback({ config }: Props) {
  return <Humanoid3D config={config} />;
}

/** GLB из `modelOverride` (если выбран руками) → `config.modelPath` →
 *  fallback Humanoid3D. */
export function CharacterAvatar3D({ config }: Props) {
  const modelOverride = useCharacterStore((s) => s.modelOverride);
  const modelPath = resolveModelPath({ modelOverride, config }) ?? DEFAULT_GLB_PATH;
  const loading = <ModelLoadingPlaceholder />;
  const fallback = <ProceduralFallback config={config} />;

  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={loading}>
        <GlbCharacter3D key={modelPath} config={config} modelPath={modelPath} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
