"use client";

import { sberTheme } from "@/lib/sber/theme";

interface Props {
  variant?: "portrait" | "room";
}

/** Простая мебель из примитивов THREE — общая для портрета и полной комнаты. */
export function ConsultantFurniture({ variant = "room" }: Props) {
  const compact = variant === "portrait";

  return (
    <group>
      {/* Стол */}
      <mesh position={compact ? [1.15, 0.38, -1.08] : [1.35, 0.42, -1.05]} castShadow>
        <boxGeometry args={compact ? [0.7, 0.06, 0.4] : [0.9, 0.08, 0.5]} />
        <meshStandardMaterial color={sberTheme.bgElevated} roughness={0.85} />
      </mesh>
      <mesh position={compact ? [0.9, 0.2, -1.25] : [1.05, 0.2, -1.28]} castShadow>
        <boxGeometry args={[0.07, 0.36, 0.07]} />
        <meshStandardMaterial color={sberTheme.greenDeep} />
      </mesh>
      <mesh position={compact ? [1.4, 0.2, -0.92] : [1.65, 0.2, -0.82]} castShadow>
        <boxGeometry args={[0.07, 0.36, 0.07]} />
        <meshStandardMaterial color={sberTheme.greenDeep} />
      </mesh>

      {/* Стул */}
      <mesh position={compact ? [0.55, 0.22, -0.75] : [0.65, 0.24, -0.55]} castShadow>
        <boxGeometry args={[0.38, 0.05, 0.38]} />
        <meshStandardMaterial color={sberTheme.bgPanel} roughness={0.9} />
      </mesh>
      <mesh position={compact ? [0.55, 0.48, -0.92] : [0.65, 0.52, -0.72]} castShadow>
        <boxGeometry args={[0.38, 0.42, 0.05]} />
        <meshStandardMaterial color={sberTheme.bgPanel} roughness={0.9} />
      </mesh>
      <mesh position={compact ? [0.55, 0.12, -0.75] : [0.65, 0.12, -0.55]} castShadow>
        <boxGeometry args={[0.05, 0.24, 0.05]} />
        <meshStandardMaterial color={sberTheme.greenDeep} />
      </mesh>

      {/* Полка */}
      <group position={compact ? [-1.65, 0.85, -1.12] : [-1.85, 0.95, -1.35]}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.04, 0.22]} />
          <meshStandardMaterial color={sberTheme.bgElevated} />
        </mesh>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.55, 0.04, 0.22]} />
          <meshStandardMaterial color={sberTheme.bgElevated} />
        </mesh>
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[0.55, 0.04, 0.22]} />
          <meshStandardMaterial color={sberTheme.bgElevated} />
        </mesh>
        <mesh position={[-0.24, 0.35, 0]} castShadow>
          <boxGeometry args={[0.04, 0.74, 0.22]} />
          <meshStandardMaterial color={sberTheme.greenDeep} />
        </mesh>
        <mesh position={[0.24, 0.35, 0]} castShadow>
          <boxGeometry args={[0.04, 0.74, 0.22]} />
          <meshStandardMaterial color={sberTheme.greenDeep} />
        </mesh>
      </group>

      {/* Растение */}
      <group position={compact ? [1.75, 0, -1.1] : [1.95, 0, -1.3]}>
        <mesh position={[0, 0.14, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 0.28, 8]} />
          <meshStandardMaterial color={sberTheme.bgPanel} roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.42, 0]} castShadow>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshStandardMaterial color={sberTheme.green} roughness={0.8} />
        </mesh>
        <mesh position={[0.12, 0.52, 0.05]} castShadow>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color={sberTheme.greenLight} roughness={0.8} />
        </mesh>
        <mesh position={[-0.1, 0.48, -0.06]} castShadow>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color={sberTheme.greenDark} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}
