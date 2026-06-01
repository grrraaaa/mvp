"use client";

import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  openness?: number;
  /** Предпочтительно: обновляется каждый кадр без React re-render */
  opennessRef?: MutableRefObject<number>;
  skinTone: string;
  lipColor?: string;
  /** Масштаб от размера головы модели */
  scale?: number;
  /** Рот виден на протяжении всей речи, даже между слогами */
  active?: boolean;
}

/** Упрощённый рот поверх статичной головы (нет morph targets). */
export function ProceduralMouth({
  openness = 0,
  opennessRef,
  skinTone,
  lipColor = "#d62828",
  scale = 1.2,
  active = true,
}: Props) {
  const jawRef = useRef<THREE.Group>(null);
  const upperRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const open = THREE.MathUtils.clamp(
      opennessRef?.current ?? openness,
      0,
      1
    );

    const jaw = jawRef.current;
    if (jaw) {
      jaw.position.y = -open * 0.045;
      jaw.rotation.x = open * 0.55;
    }
    if (upperRef.current) {
      upperRef.current.scale.y = 0.55 + open * 0.45;
    }
    if (groupRef.current) {
      groupRef.current.visible = active;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0.02]} scale={scale}>
      <mesh ref={upperRef} position={[0, 0.012, 0]}>
        <boxGeometry args={[0.09, 0.022, 0.028]} />
        <meshStandardMaterial
          color={lipColor}
          roughness={0.35}
          emissive={lipColor}
          emissiveIntensity={0.15}
        />
      </mesh>
      <group ref={jawRef}>
        <mesh position={[0, -0.018, 0]}>
          <boxGeometry args={[0.078, 0.026, 0.034]} />
          <meshStandardMaterial
            color={lipColor}
            roughness={0.4}
            emissive={lipColor}
            emissiveIntensity={0.12}
          />
        </mesh>
        <mesh position={[0, -0.032, 0.008]}>
          <boxGeometry args={[0.062, 0.014, 0.018]} />
          <meshStandardMaterial color="#1a0505" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}
