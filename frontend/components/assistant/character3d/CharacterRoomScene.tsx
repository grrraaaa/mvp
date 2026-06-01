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
import { sberTheme } from "@/lib/sber/theme";

interface Props {
  isLoading: boolean;
  lastAssistantText: string | null;
  compact?: boolean;
  compactMobile?: boolean;
}

function SceneContent({
  isLoading,
  lastAssistantText,
  compact,
  compactMobile,
}: Props) {
  const { config } = useCharacterStore();
  const headPortrait = useModelCapabilitiesStore((s) => s.headPortraitMode);
  const light = Boolean(compact);

  useCharacterBehavior({ isLoading, lastAssistantText });

  const target: [number, number, number] = headPortrait ? [0, 0.88, 0] : [0, 1.05, 0];
  const bg = light ? sberTheme.studioLightBg : sberTheme.bg;

  return (
    <>
      <color attach="background" args={[bg]} />
      <ambientLight intensity={light ? 0.9 : 0.65} />
      <directionalLight position={[0.8, 2.2, 1.2]} intensity={light ? 1.1 : 1.35} castShadow />
      <directionalLight position={[-1.2, 1.8, 0.5]} intensity={0.45} color={sberTheme.greenLight} />
      <directionalLight position={[0, 1.2, 2]} intensity={light ? 0.55 : 0.45} color="#ffffff" />
      <spotLight
        position={[0, 2.2, 1]}
        angle={0.5}
        penumbra={0.9}
        intensity={light ? 0.5 : 0.7}
        color="#ffffff"
        castShadow
      />

      {headPortrait ? <HeadStudioBackdrop light={light} /> : <Room light={light} />}
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
    ? "h-[72px]"
    : compact
      ? "h-[148px] sm:h-[172px]"
      : "h-[200px] sm:h-[300px]";

  const borderClass = compact ? "border-gray-100" : "border-sber-border";
  const wrapperBg = compact
    ? "bg-gradient-to-b from-[#eef7f5] via-[#f4faf9] to-[#f2f4f7]"
    : "bg-[#081810]";

  return (
    <div className={`relative w-full ${height} border-b ${borderClass} overflow-hidden ${wrapperBg}`}>
      <Canvas
        shadows={!compactMobile}
        camera={{ position: [0, 1.05, 4.1], fov: compactMobile ? 42 : 36, near: 0.1, far: 50 }}
        gl={{ antialias: !compactMobile, alpha: false, powerPreference: "high-performance" }}
      >
        <Suspense fallback={<ModelLoadingPlaceholder light={compact} />}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>

      {!compactMobile && (
        <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none px-3">
          <p
            className={`text-sm font-semibold drop-shadow-md ${compact ? "text-[#1f1f22]" : "text-white"}`}
          >
            {config.name}
          </p>
          <p
            className={`text-[10px] drop-shadow-md ${compact ? "text-[#7d838a]" : "text-sber-muted"}`}
          >
            {config.subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
