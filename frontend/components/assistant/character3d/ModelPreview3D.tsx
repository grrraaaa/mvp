"use client";

/**
 * Компактный 3D-превью GLB-модели для использования в дропдауне
 * «Персонализация». Принимает явный `modelPath` (а не тянет из стора) —
 * чтобы по hover в списке моделей сразу видно было смену внешности.
 *
 * Особенности:
 *  - фиксированный «портретный» ракурс (голова + плечи), без OrbitControls
 *  - тонкая авто-rotation (idle-микродвижение) — модель «живая»
 *  - transparent canvas, фон задаёт родитель
 *  - пока грузится GLB — показываем простой wireframe-torus placeholder
 *  - изолирован от основного GlbCharacter3D: тут нет lip-sync, морфов и т.п.
 *    Преview — это «как выглядит», а не «как говорит».
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import {
  DEFAULT_GLB_PATH,
  GLB_Y_OFFSET,
  PORTRAIT_FACE_SCALE,
  PORTRAIT_HEAD_WORLD_Y,
} from "@/lib/assistant/glbCharacter";
import { stripEnvironmentFromGlb } from "@/lib/assistant/filterGlbScene";
import { fitObjectToFloor } from "@/lib/assistant/fitGlbModel";
import { analyzeHead } from "@/lib/assistant/analyzeModel";

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

interface PreviewInnerProps {
  modelPath: string;
  onHeadAnalyzed: (worldY: number) => void;
}

function PreviewInner({ modelPath, onHeadAnalyzed }: PreviewInnerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const morphMeshesRef = useRef<MorphMesh[]>([]);
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

  // Подгоняем по высоте: GLB-рост ~1.65м, голова на ~1.45м. Берём scale
  // авто-фита, но дополнительно «наезжаем» камерой, чтобы голова/плечи
  // заполняли миниатюрный канвас.
  const portraitScale = useMemo(
    () => fit.scale * PORTRAIT_FACE_SCALE,
    [fit.scale],
  );
  const baseY = useMemo(() => {
    return (
      PORTRAIT_HEAD_WORLD_Y -
      head.headCenterLocal.y * portraitScale +
      GLB_Y_OFFSET
    );
  }, [head.headCenterLocal.y, portraitScale]);

  useEffect(() => {
    morphMeshesRef.current = collectMorphMeshes(clone);
    // Сбрасываем ВСЕ morph influences, чтобы дефолтный jawopen из GLB не
    // «залипал» открытым ртом на статичном превью.
    for (const m of morphMeshesRef.current) {
      const inf = m.morphTargetInfluences;
      if (inf) for (let i = 0; i < inf.length; i++) inf[i] = 0;
    }
    if (reportedRef.current !== modelPath) {
      reportedRef.current = modelPath;
      const worldY = head.headCenterLocal.y * portraitScale + baseY;
      onHeadAnalyzed(worldY);
    }
  }, [clone, head.headCenterLocal.y, portraitScale, baseY, modelPath, onHeadAnalyzed]);

  const { actions, mixer, clips } = useAnimations(animations, groupRef);
  const hasAnimations = clips.length > 0;

  useEffect(() => {
    if (!hasAnimations || !actions) return;
    Object.values(actions).forEach((a) => a?.stop());
    const firstIdle =
      Object.keys(actions).find((n) => n.toLowerCase().includes("idle")) ??
      Object.keys(actions)[0];
    const a = firstIdle ? actions[firstIdle] : null;
    a?.reset().fadeIn(0.25).play();
    return () => {
      a?.fadeOut(0.2);
    };
  }, [actions, hasAnimations]);

  useFrame((state, delta) => {
    if (mixer) mixer.update(delta);
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    // Тонкая idle-rotation: еле заметное «дыхание» поворотом.
    g.rotation.y = Math.sin(t * 0.6) * 0.12;
    g.position.y = baseY + Math.sin(t * 1.2) * 0.006;
  });

  return (
    <group
      ref={groupRef}
      position={[fit.position.x, baseY, fit.position.z]}
      scale={portraitScale}
    >
      <primitive object={clone} />
    </group>
  );
}

function CameraRig({ headWorldY }: { headWorldY: number }) {
  const { camera } = useThree();
  const applied = useRef<number | null>(null);

  useFrame(() => {
    if (applied.current === headWorldY) return;
    applied.current = headWorldY;
    const y = headWorldY || 1.45;
    // Камера чуть выше макушки, расстояние подобрано под миниатюрный канвас.
    camera.position.set(0, y + 0.12, 2.0);
    camera.lookAt(0, y - 0.02, 0);
    camera.updateProjectionMatrix();
  });

  return null;
}

function Placeholder() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 1.4;
  });
  return (
    <group position={[0, 1.45, 0]}>
      <mesh ref={ref}>
        <torusGeometry args={[0.18, 0.035, 16, 48]} />
        <meshStandardMaterial color="#21A038" wireframe transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

interface ModelPreview3DProps {
  /** Путь к GLB-модели в /public. */
  modelPath: string | null | undefined;
  /** Высота канваса в px. По умолчанию 150. */
  height?: number;
}

/**
 * Настоящий 3D-превью GLB-модели. Используется в PersonalizationMenu
 * вместо плоского эмодзи-аватара.
 */
export function ModelPreview3D({ modelPath, height = 150 }: ModelPreview3DProps) {
  const [mounted, setMounted] = useState(false);
  const [headWorldY, setHeadWorldY] = useState(1.45);
  useEffect(() => setMounted(true), []);

  const path = modelPath ?? DEFAULT_GLB_PATH;

  if (!mounted) {
    return (
      <div
        style={{ height }}
        className="w-full rounded-lg bg-gradient-to-br from-slate-50 to-white"
        aria-hidden
      />
    );
  }

  return (
    <div
      style={{ height }}
      className="relative w-full overflow-hidden rounded-lg bg-gradient-to-br from-slate-50 via-white to-slate-50"
    >
      <Canvas
        className="!h-full !w-full"
        camera={{ position: [0, 1.55, 2.0], fov: 32, near: 0.05, far: 50 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "default",
        }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.85} color="#ffffff" />
        <directionalLight position={[1.5, 2.5, 2.5]} intensity={1.0} color="#fff5e1" />
        <directionalLight position={[-2, 1.5, 1.5]} intensity={0.45} color="#dceeff" />
        <directionalLight position={[0, 1.4, 3.2]} intensity={0.5} color="#ffffff" />
        <Suspense fallback={<Placeholder />}>
          <CameraRig headWorldY={headWorldY} />
          <PreviewInner
            key={path}
            modelPath={path}
            onHeadAnalyzed={setHeadWorldY}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(DEFAULT_GLB_PATH);
