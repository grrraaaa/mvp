"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
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

interface Props {
  /** Размер вьюпорта (квадрат). По умолчанию 192. */
  size?: number;
  /** Горизонтальный поворот камеры (радианы). */
  yaw?: number;
  /** Вертикальный наклон (радианы). */
  pitch?: number;
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

function WelcomeCharacterInner({
  modelPath,
  yaw,
  pitch,
}: {
  modelPath: string;
  yaw: number;
  pitch: number;
}) {
  const modelRef = useRef<THREE.Group>(null);
  const headCenterRef = useRef(new THREE.Vector3());
  const morphMeshesRef = useRef<MorphMesh[]>([]);
  const lipBindingsRef = useRef<Array<{ meshIndex: number; morphIndex: number }>>([]);

  const { scene, animations } = useGLTF(modelPath);
  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(scene) as THREE.Group;
    stripEnvironmentFromGlb(c);
    prepareMaterials(c);
    return c;
  }, [scene]);

  const fit = useMemo(() => fitObjectToFloor(clone), [clone]);
  const head = useMemo(() => analyzeHead(clone), [clone]);

  const modelPos = useMemo(() => {
    // Зум на верхнюю часть: поднимаем базу так, чтобы голова оказалась ~в центре вида
    const headLocalY = head.headCenterLocal.y * fit.scale;
    const baseY = fit.position.y - headLocalY * 0.6; // смещаем вверх, оставляя часть торса
    return new THREE.Vector3(fit.position.x, baseY, fit.position.z);
  }, [fit, head]);

  const modelScale = useMemo(() => fit.scale * 1.4, [fit]);

  useEffect(() => {
    morphMeshesRef.current = collectMorphMeshes(clone);
    lipBindingsRef.current = collectLipBindings(morphMeshesRef.current);
    headCenterRef.current.copy(head.headCenterLocal);
    for (const m of morphMeshesRef.current) {
      const inf = m.morphTargetInfluences;
      if (inf) for (let i = 0; i < inf.length; i++) inf[i] = 0;
    }
  }, [clone, head]);

  // Лёгкая idle-анимация + микро-движения, чтобы персонаж «жил»
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

  useFrame((state, delta) => {
    if (mixer) mixer.update(delta);
    const g = modelRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.rotation.y = yaw + Math.sin(t * 0.6) * 0.04;
    g.rotation.x = pitch + Math.sin(t * 0.8) * 0.01;
    g.position.y = modelPos.y + Math.sin(t * 1.2) * 0.01;
  });

  return (
    <group
      ref={modelRef}
      position={modelPos}
      rotation={[pitch, yaw, 0]}
      scale={modelScale}
    >
      <primitive object={clone} />
    </group>
  );
}

function StudioLights() {
  return (
    <>
      <ambientLight intensity={0.85} color="#ffffff" />
      <directionalLight position={[1.5, 2.5, 2.5]} intensity={1.0} color="#fff5e1" />
      <directionalLight position={[-2, 1.5, 1.5]} intensity={0.45} color="#dceeff" />
      <directionalLight position={[0, 1.4, 3.2]} intensity={0.5} color="#ffffff" />
    </>
  );
}

/**
 * Компактный 3D-аватар для приветственного экрана плавающего чата.
 * Канвас квадратный, без скролла, без орбит-контролов — просто «портрет»
 * с лёгкой idle-анимацией.
 */
export function WelcomeCharacter3D({ size = 192, yaw = 0, pitch = 0 }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const modelPath = resolveModelPath({
    modelOverride: useCharacterStore((s) => s.modelOverride),
    config: useCharacterStore.getState().config,
  }) ?? DEFAULT_GLB_PATH;

  if (!mounted) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-gradient-to-br from-[#f4e4d4] to-[#e8c8a8] flex items-center justify-center text-[#5a3a20] font-bold shadow-md border-2 border-white/40"
        aria-hidden
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full overflow-hidden shadow-md border-2 border-white/40 bg-gradient-to-br from-[#e8f1ee] via-[#eef7f5] to-[#e5f0ec]"
    >
      <Canvas
        className="!h-full !w-full"
        camera={{ position: [0, 0.05, 1.5], fov: 28, near: 0.05, far: 20 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <StudioLights />
          <WelcomeCharacterInner
            key={modelPath}
            modelPath={modelPath}
            yaw={yaw}
            pitch={pitch}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_SASHA_LADY1);
useGLTF.preload(MODEL_SASHA_LADY2);
useGLTF.preload(DEFAULT_GLB_PATH);
