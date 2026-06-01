"use client";

import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AssistantCharacterConfig } from "@/lib/assistant/characterTypes";
import { lipOpennessAt } from "@/lib/assistant/lipSync";
import { useCharacterBehaviorStore } from "@/store/characterBehaviorStore";
import { SpeechBubble3D } from "./SpeechBubble3D";

const HOME = new THREE.Vector3(0, 0, 0.08);
const DESK = new THREE.Vector3(0.52, 0, -0.28);
const CAMERA_LOOK = new THREE.Vector3(0, 1.55, 3.6);

const WALK_SPEED = 0.42;
const ARRIVE_EPS = 0.05;

interface Props {
  config: AssistantCharacterConfig;
}

export function Humanoid3D({ config }: Props) {
  const rootRef = useRef<THREE.Group>(null);
  const hipsRef = useRef<THREE.Group>(null);
  const chestRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Group>(null);
  const upperLipRef = useRef<THREE.Mesh>(null);

  const leftUpperLegRef = useRef<THREE.Group>(null);
  const rightUpperLegRef = useRef<THREE.Group>(null);
  const leftLowerLegRef = useRef<THREE.Group>(null);
  const rightLowerLegRef = useRef<THREE.Group>(null);
  const leftUpperArmRef = useRef<THREE.Group>(null);
  const rightUpperArmRef = useRef<THREE.Group>(null);
  const leftLowerArmRef = useRef<THREE.Group>(null);
  const rightLowerArmRef = useRef<THREE.Group>(null);

  const positionRef = useRef(HOME.clone());
  const walkPhase = useRef(0);
  const lookTarget = useRef(new THREE.Vector3());
  const walkArrivedRef = useRef(false);

  const {
    action,
    speechText,
    walkPhase: walkMode,
    lipTimeline,
    talkStartedAt,
    onWalkComplete,
  } = useCharacterBehaviorStore();

  const isFemale = config.styleId === "human-f";
  const skin = config.skinTone;
  const suit = config.primaryColor;
  const shirt = config.accentColor;
  const hair = config.hairColor;

  useFrame((state, delta) => {
    const root = rootRef.current;
    const hips = hipsRef.current;
    const head = headRef.current;
    const jaw = jawRef.current;
    if (!root || !hips || !head || !jaw) return;

    const t = state.clock.elapsedTime;
    let moving = false;
    let walkTarget: THREE.Vector3 | null = null;

    if (action === "walk") {
      walkTarget = walkMode === "to_home" ? HOME : DESK;
      const pos = positionRef.current;
      const to = walkTarget.clone().sub(pos);
      const dist = to.length();

      if (dist < ARRIVE_EPS) {
        if (!walkArrivedRef.current) {
          walkArrivedRef.current = true;
          onWalkComplete();
        }
      } else {
        walkArrivedRef.current = false;
        to.normalize().multiplyScalar(WALK_SPEED * delta);
        pos.add(to);
        moving = true;
        const faceAngle = Math.atan2(
          CAMERA_LOOK.x - pos.x,
          CAMERA_LOOK.z - pos.z
        );
        root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, faceAngle, 0.06);
      }
    } else {
      const faceAngle = Math.atan2(
        CAMERA_LOOK.x - positionRef.current.x,
        CAMERA_LOOK.z - positionRef.current.z
      );
      root.rotation.y = THREE.MathUtils.lerp(
        root.rotation.y,
        faceAngle,
        action === "talk" ? 0.14 : 0.05
      );
    }

    root.position.copy(positionRef.current);

    const breathe = Math.sin(t * 1.2) * 0.008;
    const walkBob = moving ? Math.sin(walkPhase.current) * 0.025 : 0;
    hips.position.y = 1.02 + breathe + walkBob;

    if (moving) walkPhase.current += delta * 4.2;
    else walkPhase.current *= 0.92;

    const stride = moving ? Math.sin(walkPhase.current) * 0.28 : 0;
    const armSwing = moving ? Math.sin(walkPhase.current) * 0.22 : Math.sin(t * 0.8) * 0.04;

    if (leftUpperLegRef.current) leftUpperLegRef.current.rotation.x = stride;
    if (rightUpperLegRef.current) rightUpperLegRef.current.rotation.x = -stride;
    if (leftLowerLegRef.current) leftLowerLegRef.current.rotation.x = moving ? Math.max(0, stride) * 0.6 : 0;
    if (rightLowerLegRef.current) rightLowerLegRef.current.rotation.x = moving ? Math.max(0, -stride) * 0.6 : 0;

    if (leftUpperArmRef.current) leftUpperArmRef.current.rotation.x = -armSwing - 0.15;
    if (rightUpperArmRef.current) rightUpperArmRef.current.rotation.x = armSwing - 0.15;
    if (leftLowerArmRef.current) leftLowerArmRef.current.rotation.x = -0.35;
    if (rightLowerArmRef.current) rightLowerArmRef.current.rotation.x = -0.35;

    if (action === "think") {
      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -0.06, 0.08);
      head.rotation.y = Math.sin(t * 1.5) * 0.04;
      if (rightUpperArmRef.current) {
        rightUpperArmRef.current.rotation.x = -0.9;
        rightUpperArmRef.current.rotation.z = 0.25;
      }
    } else if (action === "talk") {
      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, 0.02, 0.1);
      if (rightUpperArmRef.current) {
        rightUpperArmRef.current.rotation.x = -0.45;
        rightUpperArmRef.current.rotation.z = 0.08;
      }
    } else {
      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, 0, 0.08);
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, 0, 0.08);
    }

    lookTarget.current.copy(CAMERA_LOOK);
    head.lookAt(lookTarget.current);

    const openness =
      action === "talk"
        ? lipOpennessAt(lipTimeline, talkStartedAt ?? 0)
        : 0;

    jaw.rotation.x = openness * 0.38;
    if (upperLipRef.current) {
      upperLipRef.current.position.y = 0.02 + openness * 0.015;
      upperLipRef.current.scale.y = 0.7 + openness * 0.5;
    }
  });

  const headScale = isFemale ? 0.94 : 1;

  return (
    <group ref={rootRef} position={HOME.toArray()}>
      <group ref={hipsRef} position={[0, 1.02, 0]}>
        <SpeechBubble3D text={speechText ?? ""} visible={action === "talk"} />

        {/* Ноги */}
        <Leg
          side={-1}
          upperRef={leftUpperLegRef}
          lowerRef={leftLowerLegRef}
          suit={suit}
          skin={skin}
        />
        <Leg
          side={1}
          upperRef={rightUpperLegRef}
          lowerRef={rightLowerLegRef}
          suit={suit}
          skin={skin}
        />

        {/* Торс — пиджак */}
        <group ref={chestRef} position={[0, 0.42, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.52, 0.62, 0.28]} />
            <meshStandardMaterial color={suit} roughness={0.65} metalness={0.08} />
          </mesh>
          <mesh position={[0, 0.02, 0.1]}>
            <boxGeometry args={[0.22, 0.5, 0.06]} />
            <meshStandardMaterial color={shirt} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.22, 0.15]}>
            <boxGeometry args={[0.08, 0.18, 0.04]} />
            <meshStandardMaterial color={shirt} roughness={0.5} metalness={0.2} />
          </mesh>
        </group>

        {/* Руки */}
        <Arm side={-1} upperRef={leftUpperArmRef} lowerRef={leftLowerArmRef} suit={suit} skin={skin} />
        <Arm side={1} upperRef={rightUpperArmRef} lowerRef={rightLowerArmRef} suit={suit} skin={skin} />

        {/* Шея + голова */}
        <group ref={headRef} position={[0, 0.88, 0]}>
          <mesh position={[0, -0.08, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.08, 0.1, 12]} />
            <meshStandardMaterial color={skin} roughness={0.85} />
          </mesh>

          <group scale={headScale}>
            <mesh castShadow>
              <sphereGeometry args={[0.19, 24, 24]} />
              <meshStandardMaterial color={skin} roughness={0.75} />
            </mesh>

            {/* Волосы */}
            <mesh position={[0, 0.1, -0.02]} castShadow>
              <sphereGeometry args={[0.2, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={hair} roughness={0.9} />
            </mesh>
            {isFemale && (
              <mesh position={[0, 0.02, -0.16]} castShadow>
                <boxGeometry args={[0.32, 0.38, 0.08]} />
                <meshStandardMaterial color={hair} roughness={0.9} />
              </mesh>
            )}

            {/* Глаза */}
            <mesh position={[-0.07, 0.04, 0.16]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color="#fafafa" />
            </mesh>
            <mesh position={[0.07, 0.04, 0.16]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color="#fafafa" />
            </mesh>
            <mesh position={[-0.07, 0.04, 0.18]}>
              <sphereGeometry args={[0.014, 8, 8]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            <mesh position={[0.07, 0.04, 0.18]}>
              <sphereGeometry args={[0.014, 8, 8]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>

            {/* Рот / липсинг */}
            <group ref={jawRef} position={[0, -0.06, 0.17]}>
              <mesh position={[0, -0.02, 0]}>
                <boxGeometry args={[0.1, 0.04, 0.03]} />
                <meshStandardMaterial color="#c4756a" roughness={0.6} />
              </mesh>
              <mesh ref={upperLipRef} position={[0, 0.02, 0.01]}>
                <boxGeometry args={[0.09, 0.018, 0.02]} />
                <meshStandardMaterial color="#b85c5c" />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

function Leg({
  side,
  upperRef,
  lowerRef,
  suit,
  skin,
}: {
  side: number;
  upperRef: RefObject<THREE.Group | null>;
  lowerRef: RefObject<THREE.Group | null>;
  suit: string;
  skin: string;
}) {
  return (
    <group position={[side * 0.11, 0, 0]}>
      <group ref={upperRef}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.38, 8, 16]} />
          <meshStandardMaterial color={suit} roughness={0.7} />
        </mesh>
        <group ref={lowerRef} position={[0, -0.44, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.065, 0.36, 8, 16]} />
            <meshStandardMaterial color={suit} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.42, 0.04]} castShadow>
            <boxGeometry args={[0.1, 0.05, 0.18]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function Arm({
  side,
  upperRef,
  lowerRef,
  suit,
  skin,
}: {
  side: number;
  upperRef: RefObject<THREE.Group | null>;
  lowerRef: RefObject<THREE.Group | null>;
  suit: string;
  skin: string;
}) {
  return (
    <group position={[side * 0.34, 0.72, 0]}>
      <group ref={upperRef}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <capsuleGeometry args={[0.055, 0.3, 8, 16]} />
          <meshStandardMaterial color={suit} roughness={0.7} />
        </mesh>
        <group ref={lowerRef} position={[0, -0.36, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <capsuleGeometry args={[0.048, 0.28, 8, 16]} />
            <meshStandardMaterial color={suit} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.32, 0]} castShadow>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial color={skin} roughness={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
