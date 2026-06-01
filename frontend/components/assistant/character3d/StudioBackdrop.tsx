"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { sberTheme } from "@/lib/sber/theme";

interface Props {
  variant?: "portrait" | "wide";
  /** Светлая студия для встроенного чата СББОЛ */
  light?: boolean;
}

/**
 * Минималистичная студия: мягкий градиент, кольцевой свет, без «кубической» мебели.
 */
export function StudioBackdrop({ variant = "portrait", light = false }: Props) {
  const wide = variant === "wide";

  const backdropMat = useMemo(() => {
    if (light) {
      return new THREE.MeshStandardMaterial({
        color: "#e8f4f2",
        roughness: 1,
        metalness: 0,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: sberTheme.bgPanel,
      roughness: 1,
      emissive: sberTheme.greenDeep,
      emissiveIntensity: 0.15,
    });
  }, [light]);

  const floorMat = useMemo(() => {
    if (light) {
      return new THREE.MeshStandardMaterial({
        color: "#f7fbfa",
        roughness: 0.35,
        metalness: 0.08,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: "#0c2218",
      roughness: 0.45,
      metalness: 0.25,
    });
  }, [light]);

  const rimColor = light ? "#90d0cc" : sberTheme.greenLight;

  return (
    <group>
      <mesh position={[0, wide ? 1.35 : 1.25, -1.35]} receiveShadow material={backdropMat}>
        <planeGeometry args={[wide ? 7.5 : 5.5, wide ? 4.2 : 3.4]} />
      </mesh>

      <mesh
        position={[0, wide ? 1.35 : 1.25, -1.33]}
        rotation={[0, 0, 0]}
      >
        <planeGeometry args={[wide ? 4.2 : 3, wide ? 2.8 : 2.2]} />
        <meshStandardMaterial
          color={light ? sberTheme.green : sberTheme.green}
          transparent
          opacity={light ? 0.06 : 0.12}
          roughness={1}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow material={floorMat}>
        <circleGeometry args={[wide ? 3.2 : 2.4, 64]} />
      </mesh>

      <mesh position={[0, wide ? 1.5 : 1.35, -1.1]}>
        <torusGeometry args={[wide ? 1.8 : 1.35, 0.02, 16, 64]} />
        <meshStandardMaterial
          color={rimColor}
          emissive={rimColor}
          emissiveIntensity={light ? 0.35 : 0.55}
          transparent
          opacity={0.85}
        />
      </mesh>

      <pointLight
        position={[0, 2, 1.2]}
        intensity={light ? 0.5 : 0.35}
        color="#ffffff"
        distance={6}
      />
      <pointLight
        position={[-1.2, 1.4, 0.8]}
        intensity={light ? 0.25 : 0.2}
        color={sberTheme.greenLight}
        distance={5}
      />
    </group>
  );
}
