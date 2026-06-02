"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Плейсхолдер пока грузится GLB (~20 MB). */
export function ModelLoadingPlaceholder({ light: _light }: { light?: boolean } = {}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 1.2;
  });

  return (
    <group position={[0, 1.45, 0]}>
      <mesh ref={ref}>
        <torusGeometry args={[0.22, 0.04, 16, 48]} />
        <meshStandardMaterial color="#21A038" wireframe transparent opacity={0.85} />
      </mesh>
    </group>
  );
}
