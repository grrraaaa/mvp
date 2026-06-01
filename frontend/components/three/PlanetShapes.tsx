"use client";

import { Billboard, Text } from "@react-three/drei";
import type { PlanetThemeId } from "@/lib/sber/planetTexture";

interface ShapeProps {
  themeId: PlanetThemeId;
  label: string;
  color: string;
  emissive: string;
  glow: number;
  scale?: number;
}

function M({
  color,
  emissive,
  glow,
  metalness = 0.15,
}: {
  color: string;
  emissive: string;
  glow: number;
  metalness?: number;
}) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={glow}
      roughness={0.38}
      metalness={metalness}
    />
  );
}

function Label({ text, y = -0.72, scale = 1 }: { text: string; y?: number; scale?: number }) {
  return (
    <Billboard position={[0, y * scale, 0.06 * scale]} follow>
      <Text
        fontSize={0.22 * scale}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02 * scale}
        outlineColor="#000000"
        material-toneMapped={false}
      >
        {text}
      </Text>
    </Billboard>
  );
}

/** Собранные из примитивов «планеты»-иконки разделов (не сферы). */
export function PlanetShape({
  themeId,
  label,
  color,
  emissive,
  glow,
  scale = 1.42,
}: ShapeProps) {
  const s = scale;

  switch (themeId) {
    case "cards":
      return (
        <group scale={s}>
          <mesh position={[0, 0.05, 0]} castShadow>
            <boxGeometry args={[1.15, 0.72, 0.1]} />
            <M color="#1565c0" emissive={emissive} glow={glow} />
          </mesh>
          <mesh position={[-0.38, 0.12, 0.06]} castShadow>
            <boxGeometry args={[0.2, 0.15, 0.04]} />
            <M color="#ffc107" emissive={emissive} glow={glow * 0.6} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0.05, -0.08 + i * 0.14, 0.055]}>
              <boxGeometry args={[0.75, 0.04, 0.02]} />
              <M color="#e3f2fd" emissive={emissive} glow={glow * 0.3} />
            </mesh>
          ))}
          <Label text={label} scale={s} />
        </group>
      );

    case "deposits":
      return (
        <group scale={s}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.48, 0.12, 32]} />
            <M color="#8d6e63" emissive={emissive} glow={glow * 0.5} />
          </mesh>
          {[-0.22, -0.07, 0.08, 0.23].map((x, i) => (
            <mesh key={i} position={[x, -0.02 + i * 0.04, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.14, 0.1, 24]} />
              <M color={i % 2 === 0 ? "#ffd54f" : "#ffca28"} emissive={emissive} glow={glow} />
            </mesh>
          ))}
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[0.08, 0.35, 0.08]} />
            <M color="#4caf50" emissive={emissive} glow={glow} />
          </mesh>
          <mesh position={[0, 0.58, 0]} castShadow>
            <coneGeometry args={[0.22, 0.2, 4]} />
            <M color="#66bb6a" emissive={emissive} glow={glow} />
          </mesh>
          <Label text={label} y={-0.78} scale={s} />
        </group>
      );

    case "credits":
      return (
        <group scale={s}>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[1.05, 0.38, 0.55]} />
            <M color="#ff7043" emissive={emissive} glow={glow} />
          </mesh>
          <mesh position={[0.12, 0.22, 0]} castShadow>
            <boxGeometry args={[0.55, 0.28, 0.45]} />
            <M color="#bdbdbd" emissive={emissive} glow={glow * 0.4} />
          </mesh>
          {[-0.32, 0.32].map((x) => (
            <mesh key={x} position={[x, -0.28, 0.12]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.12, 0.12, 0.14, 20]} />
              <M color="#424242" emissive={emissive} glow={glow * 0.3} />
            </mesh>
          ))}
          <mesh position={[0.42, 0.35, 0.3]} castShadow>
            <boxGeometry args={[0.28, 0.32, 0.06]} />
            <M color="#ffffff" emissive={emissive} glow={glow * 0.5} />
          </mesh>
          <Label text={label} scale={s} />
        </group>
      );

    case "investments":
      return (
        <group scale={s}>
          {[
            { x: -0.36, h: 0.35 },
            { x: -0.12, h: 0.5 },
            { x: 0.12, h: 0.7 },
            { x: 0.36, h: 0.45 },
          ].map((bar) => (
            <mesh
              key={bar.x}
              position={[bar.x, -0.2 + bar.h / 2, 0]}
              castShadow
            >
              <boxGeometry args={[0.2, bar.h, 0.2]} />
              <M color="#7e57c2" emissive={emissive} glow={glow} />
            </mesh>
          ))}
          <mesh position={[0, 0.55, 0.05]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.06, 24]} />
            <M color="#ffd700" emissive={emissive} glow={glow} metalness={0.5} />
          </mesh>
          <Label text={label} y={-0.75} scale={s} />
        </group>
      );

    case "insurance":
      return (
        <group scale={s}>
          <mesh position={[0, 0.08, 0]} castShadow>
            <coneGeometry args={[0.55, 0.75, 4]} />
            <M color="#00897b" emissive={emissive} glow={glow} />
          </mesh>
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.7, 0.2, 0.35]} />
            <M color="#00695c" emissive={emissive} glow={glow * 0.7} />
          </mesh>
          <mesh position={[0, 0.15, 0.2]} rotation={[0, 0, -0.4]} castShadow>
            <boxGeometry args={[0.45, 0.08, 0.06]} />
            <M color="#ffffff" emissive={emissive} glow={glow * 0.4} />
          </mesh>
          <Label text={label} scale={s} />
        </group>
      );

    case "payments":
      return (
        <group scale={s}>
          <mesh position={[-0.38, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.08, 24]} />
            <M color="#a5d6a7" emissive={emissive} glow={glow} />
          </mesh>
          <mesh position={[0.38, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.08, 24]} />
            <M color="#81c784" emissive={emissive} glow={glow} />
          </mesh>
          <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <boxGeometry args={[0.55, 0.1, 0.1]} />
            <M color="#ffffff" emissive={emissive} glow={glow * 0.5} />
          </mesh>
          <mesh position={[0, -0.15, 0]} castShadow>
            <boxGeometry args={[0.5, 0.65, 0.12]} />
            <M color="#2e7d32" emissive={emissive} glow={glow} />
          </mesh>
          <Billboard position={[0, -0.12, 0.08]} follow>
            <Text
              fontSize={0.14}
              color="#fff"
              anchorX="center"
              anchorY="middle"
              material-toneMapped={false}
            >
              ERIP
            </Text>
          </Billboard>
          <Label text={label} y={-0.82} scale={s} />
        </group>
      );

    default:
      return (
        <group scale={s}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 0.8, 0.8]} />
            <M color={color} emissive={emissive} glow={glow} />
          </mesh>
          <Label text={label} scale={s} />
        </group>
      );
  }
}

/** Мини-спутник — упрощённая версия темы. */
export function SatelliteShape({
  themeId,
  label,
  emissive,
  glow,
}: Omit<ShapeProps, "color"> & { color?: string }) {
  return (
    <PlanetShape
      themeId={themeId}
      label={label}
      color="#8899aa"
      emissive={emissive}
      glow={glow}
      scale={0.52}
    />
  );
}
