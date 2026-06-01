"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { HeadStudioBackdrop } from "./HeadStudioBackdrop";
import { Room } from "./Room";
import { CharacterAvatar3D } from "./CharacterAvatar3D";
import { ModelLoadingPlaceholder } from "./ModelLoadingPlaceholder";
import { useCharacterStore } from "@/store/characterStore";
import { useCharacterBehavior } from "@/hooks/useCharacterBehavior";
import { useModelCapabilitiesStore } from "@/store/modelCapabilitiesStore";

interface Props {
  isLoading: boolean;
  lastAssistantText: string | null;
  compact?: boolean;
  compactMobile?: boolean;
}

function SceneContent({ isLoading, lastAssistantText, compact, compactMobile }: Props) {
  const { config } = useCharacterStore();
  const headPortrait = useModelCapabilitiesStore((s) => s.headPortraitMode);

  useCharacterBehavior({ isLoading, lastAssistantText });

  const target: [number, number, number] = headPortrait ? [0, 0.88, 0] : [0, 1.05, 0];

  return (
    <>
      <color attach="background" args={["#041810"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[0.8, 2.2, 1.2]} intensity={1.35} castShadow />
      <directionalLight position={[-1.2, 1.8, 0.5]} intensity={0.5} color="#64D072" />
      <directionalLight position={[0, 1.2, 2]} intensity={0.45} color="#ffffff" />
      <spotLight
        position={[0, 2.2, 1]}
        angle={0.5}
        penumbra={0.9}
        intensity={0.7}
        color="#ffffff"
        castShadow
      />

      {headPortrait ? <HeadStudioBackdrop /> : <Room />}
      <CharacterAvatar3D config={config} />

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={headPortrait ? 2.5 : 3}
        maxDistance={headPortrait ? 6.5 : 7}
        minPolarAngle={headPortrait ? Math.PI / 2.8 : Math.PI / 3.8}
        maxPolarAngle={headPortrait ? Math.PI / 2.05 : Math.PI / 2.15}
        minAzimuthAngle={-0.2}
        maxAzimuthAngle={0.2}
        target={target}
      />
    </>
  );
}

export function CharacterRoomScene(props: Props) {
  const { config } = useCharacterStore();
  const { compact, compactMobile } = props;

  const height = compactMobile
    ? "h-[68px]"
    : compact
      ? "h-[140px] sm:h-[160px]"
      : "h-[200px] sm:h-[300px]";

  return (
    <div className={`relative w-full ${height} border-b border-sber-border overflow-hidden`}>
      {!compactMobile && (
        <div
          className="absolute top-2 left-2 z-10 text-[10px] text-sber-muted/80 pointer-events-none hidden sm:block"
          aria-hidden
        >
          3D · personage.glb
        </div>
      )}
      <Canvas
        shadows
        camera={{ position: [0, 1.05, 4.1], fov: compactMobile ? 42 : 36, near: 0.1, far: 50 }}
        gl={{ antialias: !compactMobile, alpha: false, powerPreference: "high-performance" }}
      >
        <Suspense fallback={<ModelLoadingPlaceholder />}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>

      {!compactMobile && (
        <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none px-3">
          <p className={`text-sm font-semibold drop-shadow-md ${compact ? "text-gray-800" : "text-white"}`}>
            {config.name}
          </p>
          <p className={`text-[10px] drop-shadow-md ${compact ? "text-gray-500" : "text-sber-muted"}`}>
            {config.subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
