"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

const PLANET_RADIUS = 0.55;

interface PlanetNodeProps {
  label: string;
  color: string;
  position: THREE.Vector3;
  isActive: boolean;
  phase?: number;
}

export function PlanetNode({
  label,
  color,
  position,
  isActive,
  phase = 0,
}: PlanetNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime + phase;

    if (planetRef.current) {
      planetRef.current.rotation.y += delta * (isActive ? 0.9 : 0.25);
      planetRef.current.rotation.x = Math.sin(t * 0.4) * 0.08;
    }

    if (atmosphereRef.current) {
      const pulse = isActive ? 1.12 + Math.sin(t * 2.5) * 0.04 : 1.08;
      atmosphereRef.current.scale.setScalar(pulse);
    }

    if (groupRef.current) {
      groupRef.current.position.y = position.y + Math.sin(t * 0.7) * 0.12;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Soft outer glow */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[PLANET_RADIUS * 1.18, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isActive ? 0.22 : 0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Planet body */}
      <mesh ref={planetRef} castShadow>
        <sphereGeometry args={[PLANET_RADIUS, 48, 48]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? 0.55 : 0.12}
          roughness={0.35}
          metalness={0.15}
          clearcoat={0.85}
          clearcoatRoughness={0.2}
        />
      </mesh>

      {/* Equator highlight */}
      <mesh rotation={[Math.PI / 2.2, 0, phase]}>
        <ringGeometry args={[PLANET_RADIUS * 0.92, PLANET_RADIUS * 1.02, 64]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={isActive ? 0.35 : 0.12}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Orbit ring when active */}
      {isActive && (
        <mesh rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[PLANET_RADIUS * 1.55, 0.03, 12, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.75} />
        </mesh>
      )}

      <Text
        position={[0, -PLANET_RADIUS - 0.45, 0]}
        fontSize={0.28}
        color="white"
        anchorX="center"
        anchorY="top"
        outlineWidth={0.025}
        outlineColor="#000000"
      >
        {label}
      </Text>
    </group>
  );
}
