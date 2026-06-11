"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { useCharacterStore, resolveModelPath } from "@/store/characterStore";
import {
  DEFAULT_GLB_PATH,
  MODEL_SASHA_LADY1,
  MODEL_SASHA_LADY2,
} from "@/lib/assistant/glbCharacter";
import { stripEnvironmentFromGlb } from "@/lib/assistant/filterGlbScene";
import { fitObjectToFloor } from "@/lib/assistant/fitGlbModel";
import { analyzeHead } from "@/lib/assistant/analyzeModel";
import { ASSISTANT_SURFACE } from "@/lib/assistant/assistantSurface";

interface Props {
  /** Полная высота канваса в px. Ширина — 100% контейнера. */
  height?: number;
  /** Отключить вращение (если канвас внутри скролл-контейнера и т.п.). */
  disableOrbit?: boolean;
}

type MorphMesh = THREE.Mesh & {
  morphTargetDictionary: Record<string, number>;
  morphTargetInfluences: number[];
};

function collectMorphMeshes(root: THREE.Object3D): MorphMesh[] {
  const list: MorphMesh[] = [];
  root.traverse((obj) => {
    const mesh = obj as MorphMesh;
    if (mesh.isMesh && mesh.morphTargetDictionary) list.push(mesh);
  });
  return list;
}

const LIP_MORPH_NAMES = [
  "jawopen",
  "jaw_open",
  "mouthopen",
  "mouth_open",
  "viseme_aa",
  "viseme_o",
  "viseme_e",
  "viseme_oh",
  "viseme_u",
  "viseme_pp",
  "vrc.v_aa",
  "vrc.v_oh",
  "vrc.v_ee",
  "mouthsmile",
  "mouthfunnel",
  "mouthpucker",
];

const LIP_MORPH_EXCLUDE = ["brow", "eye", "cheek", "blink", "squint", "nose"];

function collectLipBindings(
  meshes: Array<{ morphTargetDictionary?: Record<string, number> }>
): Array<{ meshIndex: number; morphIndex: number }> {
  const bindings: Array<{ meshIndex: number; morphIndex: number }> = [];
  const seen = new Set<string>();
  meshes.forEach((mesh, meshIndex) => {
    const dict = mesh.morphTargetDictionary;
    if (!dict) return;
    for (const key of Object.keys(dict)) {
      const lower = key.toLowerCase();
      if (!LIP_MORPH_NAMES.some((h) => lower.includes(h))) continue;
      if (LIP_MORPH_EXCLUDE.some((ex) => lower.includes(ex))) continue;
      const morphIndex = dict[key];
      const token = `${meshIndex}:${morphIndex}`;
      if (seen.has(token)) continue;
      seen.add(token);
      bindings.push({ meshIndex, morphIndex });
    }
  });
  return bindings;
}

function prepareMaterials(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      const m = mat as THREE.MeshStandardMaterial;
      if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
      if (m.emissive) {
        const peak = Math.max(m.emissive.r, m.emissive.g, m.emissive.b);
        if (peak > 0.25) {
          m.emissive.setRGB(0, 0, 0);
          m.emissiveIntensity = 0;
        }
      }
      m.needsUpdate = true;
      if (m.transparent && m.opacity < 0.05) m.visible = false;
    }
  });
}

interface InnerProps {
  modelPath: string;
  onHeadAnalyzed: (worldY: number) => void;
}

function WelcomeCharacterInner({ modelPath, onHeadAnalyzed }: InnerProps) {
  const modelRef = useRef<THREE.Group>(null);
  const morphMeshesRef = useRef<MorphMesh[]>([]);
  const lipBindingsRef = useRef<Array<{ meshIndex: number; morphIndex: number }>>([]);
  const reportedRef = useRef<string | null>(null);

  const { scene, animations } = useGLTF(modelPath);
  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(scene) as THREE.Group;
    stripEnvironmentFromGlb(c);
    prepareMaterials(c);
    return c;
  }, [scene]);

  const fit = useMemo(() => fitObjectToFloor(clone), [clone]);
  const head = useMemo(() => analyzeHead(clone), [clone]);

  useEffect(() => {
    morphMeshesRef.current = collectMorphMeshes(clone);
    lipBindingsRef.current = collectLipBindings(morphMeshesRef.current);
    if (reportedRef.current !== modelPath) {
      reportedRef.current = modelPath;
      const worldY = head.headCenterLocal.y * fit.scale + fit.position.y;
      onHeadAnalyzed(worldY);
    }
  }, [clone, head, fit, modelPath, onHeadAnalyzed]);

  const { actions, mixer } = useAnimations(animations, modelRef);
  useEffect(() => {
    if (!actions) return undefined;
    const firstIdle = Object.keys(actions).find((n) => n.toLowerCase().includes("idle"))
      ?? Object.keys(actions)[0];
    if (!firstIdle) return undefined;
    const a = actions[firstIdle];
    a?.reset().fadeIn(0.3).play();
    return () => {
      a?.fadeOut(0.2);
    };
  }, [actions]);

  // Лёгкая idle-анимация: микро-движения, чтобы персонаж «жил».
  useFrame((state, delta) => {
    if (mixer) mixer.update(delta);
    const g = modelRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.position.y = fit.position.y + Math.sin(t * 1.2) * 0.005;
  });

  return (
    <group ref={modelRef} position={fit.position} scale={fit.scale}>
      <primitive object={clone} />
    </group>
  );
}

/** Камера смотрит на верхнюю треть модели (голова/плечи), слегка
 *  приподнята над уровнем глаз. */
function PortraitRig({ headWorldY }: { headWorldY: number }) {
  const { camera } = useThree();
  const applied = useRef<number | null>(null);

  useFrame(() => {
    if (applied.current === headWorldY) return;
    applied.current = headWorldY;
    const y = headWorldY || 1.45;
    camera.position.set(0, y + 0.25, 2.6);
    camera.lookAt(0, y, 0);
    camera.updateProjectionMatrix();
  });

  return null;
}

function StudioLights() {
  return (
    <>
      <color attach="background" args={[ASSISTANT_SURFACE]} />
      <ambientLight intensity={0.85} color="#ffffff" />
      <directionalLight position={[1.5, 2.5, 2.5]} intensity={1.0} color="#fff5e1" />
      <directionalLight position={[-2, 1.5, 1.5]} intensity={0.45} color="#dceeff" />
      <directionalLight position={[0, 1.4, 3.2]} intensity={0.5} color="#ffffff" />
    </>
  );
}

/**
 * Полноразмерный прямоугольный 3D-канвас. Drag для вращения, wheel для
 * зума. Камера слегка приподнята и смотрит на голову. Без круглой клипсы —
 * аватар занимает весь контейнер.
 */
export function WelcomeCharacter3D({ height = 280, disableOrbit }: Props) {
  const [mounted, setMounted] = useState(false);
  const [headWorldY, setHeadWorldY] = useState(1.45);
  useEffect(() => setMounted(true), []);

  const modelPath = resolveModelPath({
    modelOverride: useCharacterStore((s) => s.modelOverride),
    config: useCharacterStore.getState().config,
  }) ?? DEFAULT_GLB_PATH;

  if (!mounted) {
    return (
      <div
        style={{ height }}
        className="w-full"
        aria-hidden
      />
    );
  }

  return (
    <div
      style={{ height, backgroundColor: ASSISTANT_SURFACE }}
      className="relative w-full touch-none bg-assistant-surface rounded-xl overflow-hidden"
    >
      <Canvas
        className="!h-full !w-full"
        camera={{ position: [0, 1.6, 2.6], fov: 35, near: 0.05, far: 50 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <StudioLights />
          <PortraitRig headWorldY={headWorldY} />
          <WelcomeCharacterInner
            key={modelPath}
            modelPath={modelPath}
            onHeadAnalyzed={setHeadWorldY}
          />
          {!disableOrbit && (
            <OrbitControls
              makeDefault
              enablePan={false}
              enableZoom
              enableRotate
              enableDamping
              dampingFactor={0.12}
              minDistance={1.6}
              maxDistance={5.5}
              minPolarAngle={Math.PI * 0.18}
              maxPolarAngle={Math.PI * 0.62}
              target={[0, headWorldY, 0]}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_SASHA_LADY1);
useGLTF.preload(MODEL_SASHA_LADY2);
useGLTF.preload(DEFAULT_GLB_PATH);
