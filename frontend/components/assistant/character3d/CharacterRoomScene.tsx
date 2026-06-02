"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { CharacterAvatar3D } from "./CharacterAvatar3D";
import { ModelLoadingPlaceholder } from "./ModelLoadingPlaceholder";
import { PortraitCamera } from "./PortraitCamera";
import { useCharacterStore } from "@/store/characterStore";
import { useCharacterBehavior } from "@/hooks/useCharacterBehavior";
import { useModelCapabilitiesStore } from "@/store/modelCapabilitiesStore";
import {
  PORTRAIT_BG_DARK,
  PORTRAIT_BG_EMBEDDED,
  PORTRAIT_CAMERA_FOV,
  PORTRAIT_CAMERA_Y_OFFSET,
  PORTRAIT_CAMERA_Z,
  PORTRAIT_CAMERA_Z_COMPACT,
  PORTRAIT_HEAD_WORLD_Y,
  PORTRAIT_TARGET_Y_OFFSET,
} from "@/lib/assistant/glbCharacter";
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
  const faceFraming = headPortrait;

  useCharacterBehavior({ isLoading, lastAssistantText });

  const headY = PORTRAIT_HEAD_WORLD_Y;
  const lookY = headY + PORTRAIT_TARGET_Y_OFFSET;
  const camY = headY + PORTRAIT_CAMERA_Y_OFFSET;
  const target: [number, number, number] = faceFraming
    ? [0, lookY, 0]
    : [0, 1.05, 0];
  const bg = faceFraming
    ? light
      ? PORTRAIT_BG_EMBEDDED
      : PORTRAIT_BG_DARK
    : light
      ? sberTheme.studioLightBg
      : sberTheme.bg;

  return (
    <>
      <color attach="background" args={[bg]} />
      <ambientLight intensity={faceFraming ? (light ? 0.55 : 0.48) : light ? 0.95 : 0.72} />
      <directionalLight position={[0.4, 2.4, 1.4]} intensity={light ? 1.15 : 1.4} />
      <directionalLight position={[-1.4, 1.9, 0.6]} intensity={0.5} color={sberTheme.greenLight} />
      <directionalLight position={[0, 1.6, 2.2]} intensity={light ? 0.5 : 0.4} color="#ffffff" />
      <pointLight position={[0.3, headY + 0.35, 1.2]} intensity={0.55} distance={4} />

      <PortraitCamera active={faceFraming} compact={compact} />
      <CharacterAvatar3D config={config} />

      <OrbitControls
        enablePan={false}
        enableZoom={faceFraming}
        minDistance={faceFraming ? 4.6 : 3}
        maxDistance={faceFraming ? 8.8 : 7}
        minPolarAngle={faceFraming ? Math.PI / 2.45 : Math.PI / 3.8}
        maxPolarAngle={faceFraming ? Math.PI / 2.12 : Math.PI / 2.15}
        minAzimuthAngle={-0.15}
        maxAzimuthAngle={0.15}
        target={target}
      />
    </>
  );
}

export function CharacterRoomScene(props: Props) {
  const { config } = useCharacterStore();
  const { compact, compactMobile } = props;

  const headPortrait = useModelCapabilitiesStore((s) => s.headPortraitMode);
  const faceFraming = headPortrait;
  const headY = PORTRAIT_HEAD_WORLD_Y;
  const camY = headY + PORTRAIT_CAMERA_Y_OFFSET;

  const height = compactMobile
    ? "h-[min(36dvh,280px)]"
    : compact
      ? "h-[240px] sm:h-[280px]"
      : "h-[380px] sm:h-[520px] min-h-[320px]";

  const borderClass = compact ? "border-gray-100" : "border-sber-border";
  const wrapperBg = faceFraming
    ? compact
      ? "bg-[#0a1512]"
      : "bg-[#030a08]"
    : compact
      ? "bg-gradient-to-b from-[#eef7f5] via-[#f4faf9] to-[#f2f4f7]"
      : "bg-[#081810]";

  return (
    <div className={`relative w-full ${height} border-b ${borderClass} overflow-hidden ${wrapperBg} shrink-0`}>
      <Canvas
        className="!h-full !w-full"
        shadows={false}
        camera={{
          position: faceFraming
            ? [0, camY, compact ? PORTRAIT_CAMERA_Z_COMPACT : PORTRAIT_CAMERA_Z]
            : [0, 1.05, 4.1],
          fov: faceFraming ? PORTRAIT_CAMERA_FOV : compactMobile ? 42 : 36,
          near: 0.08,
          far: 50,
        }}
        gl={{ antialias: !compactMobile, alpha: false, powerPreference: "high-performance" }}
      >
        <Suspense fallback={<ModelLoadingPlaceholder light={compact} />}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>

      {!compactMobile && (
        <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none px-3">
          <p
            className={`text-sm font-semibold drop-shadow-md ${
              faceFraming || !compact ? "text-white" : "text-[#1f1f22]"
            }`}
          >
            {config.name}
          </p>
          <p
            className={`text-[10px] drop-shadow-md ${
              faceFraming || !compact ? "text-sber-muted" : "text-[#7d838a]"
            }`}
          >
            {config.subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
