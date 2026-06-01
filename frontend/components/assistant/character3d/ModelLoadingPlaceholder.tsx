"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Плейсхолдер пока грузится GLB (~20 MB). */
export function ModelLoadingPlaceholder() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 1.2;
  });

  return (
    <group position={[0, 0.85, 0]}>
      <mesh ref={ref}>
        <torusGeometry args={[0.35, 0.06, 16, 48]} />
        <meshStandardMaterial color="#21A038" wireframe transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.12, 16]} />
        <meshStandardMaterial color="#64D072" emissive="#21A038" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}
