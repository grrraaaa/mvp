"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import type { AssistantCharacterConfig } from "@/lib/assistant/characterTypes";
import { analyzeHead } from "@/lib/assistant/analyzeModel";
import { stripEnvironmentFromGlb } from "@/lib/assistant/filterGlbScene";
import { fitObjectToFloor } from "@/lib/assistant/fitGlbModel";
import { lipOpennessAt } from "@/lib/assistant/lipSync";
import {
  ANIM_IDLE_HINTS,
  ANIM_TALK_HINTS,
  ANIM_WALK_HINTS,
  collectLipBindings,
  DEFAULT_GLB_PATH,
  findClipName,
  GLB_Y_OFFSET,
  PORTRAIT_FACE_SCALE,
  PORTRAIT_HEAD_WORLD_Y,
  listMorphTargetNames,
  type LipBinding,
} from "@/lib/assistant/glbCharacter";
import { useCharacterBehaviorStore } from "@/store/characterBehaviorStore";
import { useModelCapabilitiesStore } from "@/store/modelCapabilitiesStore";
import { SpeechBubble3D } from "./SpeechBubble3D";
import {
  applyMouthVertexDeform,
  buildMouthVertexRig,
  resetMouthVertexDeform,
} from "@/lib/assistant/mouthVertexDeform";
import { useCharacterLocomotion } from "@/hooks/useCharacterLocomotion";

interface Props {
  config: AssistantCharacterConfig;
  modelPath?: string;
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

function prepareModelMaterials(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
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

export function GlbCharacter3D({
  config,
  modelPath = DEFAULT_GLB_PATH,
}: Props) {
  const rootRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const morphMeshesRef = useRef<MorphMesh[]>([]);
  const lipBindingsRef = useRef<LipBinding[]>([]);
  const mouthRigRef = useRef<ReturnType<typeof buildMouthVertexRig> | null>(null);
  const lipOpenRef = useRef(0);
  const [hasMorphLip, setHasMorphLip] = useState(false);
  const [hasVertexLip, setHasVertexLip] = useState(false);
  const headCenterRef = useRef(new THREE.Vector3(0, 1.5, 0));
  const bubbleYRef = useRef(1.75);
  const portraitYawRef = useRef(0);
  const morphLoggedRef = useRef(false);

  const { camera } = useThree();

  const { scene, animations } = useGLTF(modelPath);
  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(scene) as THREE.Group;
    stripEnvironmentFromGlb(c);
    prepareModelMaterials(c);
    return c;
  }, [scene]);

  const fit = useMemo(() => fitObjectToFloor(clone), [clone]);
  const headAnalysis = useMemo(() => analyzeHead(clone), [clone]);
  const mouthRig = useMemo(
    () => buildMouthVertexRig(clone, headAnalysis),
    [clone, headAnalysis]
  );
  const headPortraitMode = useModelCapabilitiesStore((s) => s.headPortraitMode);
  const setCapabilities = useModelCapabilitiesStore((s) => s.setCapabilities);

  const portraitTransform = useMemo(() => {
    const head = headAnalysis;
    const mouthScale = THREE.MathUtils.clamp(head.headSizeY * 5.5, 0.9, 2.4);

    if (!headPortraitMode) {
      return {
        position: fit.position.clone(),
        scale: fit.scale,
        headCenter: head.headCenterLocal,
        mouth: head.mouthAnchorLocal,
        bubbleY: head.headCenterLocal.y + 0.55,
        mouthScale,
      };
    }
    const scale = fit.scale * PORTRAIT_FACE_SCALE;
    const baseY =
      PORTRAIT_HEAD_WORLD_Y - head.headCenterLocal.y * scale + GLB_Y_OFFSET;
    const headWorldY = head.headCenterLocal.y * scale + baseY;
    return {
      position: new THREE.Vector3(fit.position.x, baseY, fit.position.z),
      scale,
      headCenter: head.headCenterLocal,
      mouth: head.mouthAnchorLocal,
      bubbleY: headWorldY + 0.22,
      mouthScale,
    };
  }, [clone, fit, headAnalysis, headPortraitMode]);

  const { actions, mixer } = useAnimations(animations, modelRef);
  const hasAnimations = animations.length > 0;

  const { action, speechText, lipTimeline, talkStartedAt } =
    useCharacterBehaviorStore();
  useCharacterLocomotion(rootRef, {
    enabled: hasAnimations && !headPortraitMode,
  });

  useEffect(() => {
    morphMeshesRef.current = collectMorphMeshes(clone);
    lipBindingsRef.current = collectLipBindings(morphMeshesRef.current);
    const morphLip = lipBindingsRef.current.length > 0;
    const vertexLip = mouthRig.active;
    mouthRigRef.current = mouthRig;
    setHasMorphLip(morphLip);
    setHasVertexLip(vertexLip);
    headCenterRef.current.copy(portraitTransform.headCenter);
    bubbleYRef.current = portraitTransform.bubbleY;

    if (
      process.env.NODE_ENV === "development" &&
      !morphLoggedRef.current &&
      morphMeshesRef.current.length > 0
    ) {
      morphLoggedRef.current = true;
      const names = listMorphTargetNames(morphMeshesRef.current);
      if (names.length > 0) {
        console.info("[GlbCharacter3D] morph targets:", names);
      } else {
        console.info(
          "[GlbCharacter3D] morph targets: none —",
          vertexLip ? "vertex mouth deform" : "no mouth rig"
        );
      }
    }

    setCapabilities({
      isStaticMesh: !hasAnimations,
      hasMorphLip: morphLip || vertexLip,
      hasAnimations,
    });
  }, [clone, hasAnimations, mouthRig, portraitTransform, setCapabilities]);

  const clipNames = animations.map((c) => c.name);
  const idleName = findClipName(clipNames, ANIM_IDLE_HINTS);
  const walkName = findClipName(clipNames, ANIM_WALK_HINTS);
  const talkName = findClipName(clipNames, ANIM_TALK_HINTS);

  useEffect(() => {
    if (!hasAnimations || !actions) return;
    Object.values(actions).forEach((a) => a?.stop());
    let target = idleName;
    if (action === "walk" && walkName) target = walkName;
    else if (action === "talk" && talkName) target = talkName;
    const clip = target ? actions[target] : undefined;
    clip?.reset().fadeIn(0.25).play();
    return () => {
      clip?.fadeOut(0.2);
    };
  }, [action, actions, hasAnimations, idleName, walkName, talkName]);

  useFrame((state, delta) => {
    if (hasAnimations) mixer?.update(delta);

    const group = modelRef.current;
    if (!group) return;

    const t = state.clock.elapsedTime;
    const openness =
      action === "talk" ? lipOpennessAt(lipTimeline, talkStartedAt ?? 0) : 0;
    lipOpenRef.current = openness;

    if (!hasAnimations) {
      group.position.y =
        portraitTransform.position.y + Math.sin(t * 1.1) * 0.008;

      if (headPortraitMode) {
        const targetYaw = Math.atan2(
          camera.position.x - group.position.x,
          camera.position.z - group.position.z
        );
        portraitYawRef.current = THREE.MathUtils.lerp(
          portraitYawRef.current,
          targetYaw,
          0.08
        );
        group.rotation.set(0, portraitYawRef.current, 0);
      }
    }

    if (lipBindingsRef.current.length > 0) {
      for (const { meshIndex, morphIndex } of lipBindingsRef.current) {
        const mesh = morphMeshesRef.current[meshIndex];
        const influences = mesh?.morphTargetInfluences;
        if (influences && morphIndex < influences.length) {
          influences[morphIndex] = openness;
        }
      }
    } else if (mouthRigRef.current?.active) {
      if (action === "talk" && openness > 0.01) {
        applyMouthVertexDeform(mouthRigRef.current, openness);
      } else {
        resetMouthVertexDeform(mouthRigRef.current);
      }
    }
  });

  const useProceduralMouth = !hasMorphLip && !hasVertexLip;
  const showSpeechText = hasMorphLip;

  return (
    <group ref={rootRef}>
      <SpeechBubble3D
        text={speechText ?? ""}
        visible={action === "talk"}
        anchorY={bubbleYRef.current}
        showText={showSpeechText}
      />
      <group
        ref={modelRef}
        position={portraitTransform.position}
        scale={portraitTransform.scale}
      >
        <primitive object={clone} />
      </group>
    </group>
  );
}

useGLTF.preload(DEFAULT_GLB_PATH);
