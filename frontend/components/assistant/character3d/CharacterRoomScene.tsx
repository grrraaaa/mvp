"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  AdaptiveDpr,
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  SoftShadows,
  Sparkles,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";
import { CharacterAvatar3D } from "./CharacterAvatar3D";
import { ModelLoadingPlaceholder } from "./ModelLoadingPlaceholder";
import { PortraitCamera } from "./PortraitCamera";
import { useCharacterStore } from "@/store/characterStore";
import { useCharacterBehavior } from "@/hooks/useCharacterBehavior";
import { useModelCapabilitiesStore } from "@/store/modelCapabilitiesStore";
import {
  PORTRAIT_CAMERA_FOV,
  PORTRAIT_CAMERA_Y_OFFSET,
  PORTRAIT_CAMERA_Z,
  PORTRAIT_CAMERA_Z_COMPACT,
  PORTRAIT_HEAD_WORLD_Y,
  PORTRAIT_TARGET_Y_OFFSET,
} from "@/lib/assistant/glbCharacter";

interface Props {
  isLoading: boolean;
  lastAssistantText: string | null;
  compact?: boolean;
  compactMobile?: boolean;
}

/**
 * Локальная «студия»: 5 Lightformer-плоскостей дают мягкий IBL-свет без
 * зависимости от HDR/CDN. Модель получает тёплый key-сверху, холодный fill
 * слева, тёплый rim сзади и два больших прямоугольника сверху как софтбоксы.
 *
 * environmentIntensity — единый множитель IBL на все PBR-материалы модели.
 */
function StudioEnvironment() {
  return (
    <Environment
      resolution={256}
      frames={1}
      background={false}
      environmentIntensity={0.9}
    >
      {/* Большой верхний софтбокс (key) — тёплый */}
      <Lightformer
        form="rect"
        intensity={3.2}
        color="#fff3e0"
        position={[0, 4, 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[6, 4, 1]}
      />
      {/* Холодный fill слева */}
      <Lightformer
        form="rect"
        intensity={1.3}
        color="#dfeefe"
        position={[-3.5, 1.5, 1.2]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[4, 3, 1]}
      />
      {/* Тёплый rim сзади-справа — подсвечивает контур */}
      <Lightformer
        form="rect"
        intensity={1.6}
        color="#ffd8a8"
        position={[2.8, 1.8, -2.4]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[3, 2.5, 1]}
      />
      {/* Маленький акцент снизу-справа, чтобы подбородок не проваливался */}
      <Lightformer
        form="circle"
        intensity={1.1}
        color="#fff8ec"
        position={[1.2, -0.2, 1.8]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1.2, 1.2, 1]}
      />
      {/* Холодная «отрицательная» плоскость сзади — вытягивает глубину */}
      <Lightformer
        form="rect"
        intensity={0.7}
        color="#cfe7e2"
        position={[0, 1.4, -3.6]}
        rotation={[0, Math.PI, 0]}
        scale={[5, 3, 1]}
      />
    </Environment>
  );
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
  const lowFx = compact || compactMobile;

  useCharacterBehavior({ isLoading, lastAssistantText });

  const headY = PORTRAIT_HEAD_WORLD_Y;
  const lookY = headY + PORTRAIT_TARGET_Y_OFFSET;
  const camY = headY + PORTRAIT_CAMERA_Y_OFFSET;
  const target: [number, number, number] = faceFraming
    ? [0, lookY, 0]
    : [0, 1.05, 0];

  // Мягкий радиальный градиент фона: от тёплого teal-50 в центре к холодному
  // frost-50 по краям. Сделан на canvas-цвете + fog, чтобы не было «кубика».
  const bg = useMemo(() => {
    if (light) return "#eef7f5";
    return "#f4faf9";
  }, [light]);
  const fogColor = useMemo(() => {
    if (light) return "#eef7f5";
    return "#f4faf9";
  }, [light]);

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[fogColor, 7.5, 18]} />

      <StudioEnvironment />

      {/* Мягкие PCF-тени для всей сцены (недорого, без шума). */}
      {!compactMobile && <SoftShadows size={10} samples={12} focus={0.6} />}

      {/* Ambient — низкий, основной свет идёт от IBL. Без зелёного оттенка. */}
      <ambientLight intensity={light ? 0.55 : 0.35} color="#ffffff" />
      {/* Key directional — основной свет сверху-справа, отбрасывает тени. */}
      <directionalLight
        position={[2.2, 4, 2.4]}
        intensity={light ? 0.9 : 1.4}
        color="#fff5e1"
        castShadow={!compactMobile}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0008}
        shadow-radius={4}
      />
      {/* Cool fill с противоположной стороны */}
      <directionalLight
        position={[-2.4, 2.2, 1.0]}
        intensity={0.45}
        color="#dceeff"
      />
      {/* Передний «контровой» — убирает мрак на лице */}
      <directionalLight
        position={[0, 1.4, 3.2]}
        intensity={0.55}
        color="#ffffff"
      />
      <pointLight
        position={[0.3, headY + 0.35, 1.4]}
        intensity={0.6}
        distance={4}
        color="#fff4e0"
      />

      <PortraitCamera active={faceFraming} compact={compact} />
      <CharacterAvatar3D config={config} />

      {/* Мягкие контактные тени — главный «вау-эффект» под моделью. */}
      {!compactMobile && (
        <ContactShadows
          position={[0, 0.005, 0]}
          opacity={light ? 0.5 : 0.65}
          scale={6}
          blur={2.6}
          far={2.5}
          resolution={512}
          color={light ? "#0a1812" : "#0a1812"}
        />
      )}

      {/* Атмосферные искорки вокруг модели — лёгкое «магическое» ощущение. */}
      {!lowFx && (
        <Sparkles
          count={40}
          scale={[4.5, 2.6, 2.5]}
          position={[0, 1.4, 0]}
          size={2.4}
          speed={0.25}
          opacity={0.55}
          color="#cfe9d6"
        />
      )}

      <OrbitControls
        enablePan={false}
        enableZoom={faceFraming}
        minDistance={faceFraming ? 5.2 : 3}
        maxDistance={faceFraming ? 9.5 : 7}
        minPolarAngle={faceFraming ? Math.PI / 2.45 : Math.PI / 3.8}
        maxPolarAngle={faceFraming ? Math.PI / 2.12 : Math.PI / 2.15}
        minAzimuthAngle={-0.15}
        maxAzimuthAngle={0.15}
        target={target}
      />

      {/* Пост-обработка: мягкий Bloom на светлых участках + лёгкая виньетка. */}
      {!lowFx && (
        <EffectComposer multisampling={2}>
          <Bloom
            intensity={0.35}
            luminanceThreshold={0.85}
            luminanceSmoothing={0.2}
            mipmapBlur
            kernelSize={3}
          />
          <Vignette eskil={false} offset={0.35} darkness={0.35} />
        </EffectComposer>
      )}

      <AdaptiveDpr pixelated />
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
  // Тёплый градиент: сверху бирюзово-светлый, внизу — белый с холодным
  // оттенком. Подсвечивает модель снизу, как витрина магазина.
  const wrapperBg = compact
    ? "bg-gradient-to-b from-[#eef7f5] via-[#f4faf9] to-[#f2f4f7]"
    : "bg-gradient-to-b from-[#e6f4f1] via-[#eef7f5] to-[#f2f4f7]";

  return (
    <div
      className={`relative w-full ${height} border-b ${borderClass} overflow-hidden ${wrapperBg} shrink-0`}
    >
      <Canvas
        className="!h-full !w-full"
        shadows={!compactMobile}
        camera={{
          position: faceFraming
            ? [0, camY, compact ? PORTRAIT_CAMERA_Z_COMPACT : PORTRAIT_CAMERA_Z]
            : [0, 1.05, 4.1],
          fov: faceFraming ? PORTRAIT_CAMERA_FOV : compactMobile ? 42 : 36,
          near: 0.08,
          far: 50,
        }}
        gl={{
          antialias: !compactMobile,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        dpr={[1, compactMobile ? 1.25 : 1.75]}
      >
        <Suspense fallback={<ModelLoadingPlaceholder light={compact} />}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>

      {!compactMobile && (
        <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none px-3">
          <p className="text-sm font-semibold text-[#1f1f22] drop-shadow-sm">
            {config.name}
          </p>
          <p className="text-[10px] text-[#5a6470] drop-shadow-sm">
            {config.subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
