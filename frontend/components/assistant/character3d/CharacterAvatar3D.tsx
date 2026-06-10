"use client";

import { Suspense } from "react";
import type { AssistantCharacterConfig } from "@/lib/assistant/characterTypes";
import { DEFAULT_GLB_PATH } from "@/lib/assistant/glbCharacter";
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

/** GLB из `config.modelPath` (public/models/) или fallback Humanoid3D. */
export function CharacterAvatar3D({ config }: Props) {
  const modelPath = config.modelPath ?? DEFAULT_GLB_PATH;
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
