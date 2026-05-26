"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Line } from "@react-three/drei";
import * as THREE from "three";
import type { NavigationStep } from "@/store/assistantStore";

// Позиции узлов в 3D-пространстве
const NODE_POSITIONS: Record<string, [number, number, number]> = {
  "/":              [ 0,   0,  0],
  "/loans":         [-4,   0, -2],
  "/deposits":      [ 4,   0, -2],
  "/payments":      [-4,   0,  3],
  "/investments":   [ 4,   0,  3],
  "/profile":       [ 0,   0,  4],
};

const NODE_COLORS: Record<string, string> = {
  "/":            "#1a73e8",
  "/loans":       "#34a853",
  "/deposits":    "#fbbc04",
  "/payments":    "#ea4335",
  "/investments": "#9c27b0",
  "/profile":     "#00acc1",
};

interface SectionNodeProps {
  label: string;
  position: [number, number, number];
  color: string;
  isActive?: boolean;
}

function SectionNode({ label, position, color, isActive }: SectionNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current && isActive) {
      meshRef.current.rotation.y += delta * 0.8;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? 0.6 : 0.1}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      <Text
        position={[0, -1.2, 0]}
        fontSize={0.35}
        color="white"
        anchorX="center"
        anchorY="top"
      >
        {label}
      </Text>
    </group>
  );
}

interface AppMap3DProps {
  activePath?: NavigationStep[] | null;
}

export function AppMap3D({ activePath }: AppMap3DProps) {
  const activeUrls = new Set(activePath?.map((s) => s.url) || []);

  // Линии-связи между главной и разделами
  const connections: Array<[[number,number,number],[number,number,number]]> = [
    [NODE_POSITIONS["/"], NODE_POSITIONS["/loans"]],
    [NODE_POSITIONS["/"], NODE_POSITIONS["/deposits"]],
    [NODE_POSITIONS["/"], NODE_POSITIONS["/payments"]],
    [NODE_POSITIONS["/"], NODE_POSITIONS["/investments"]],
    [NODE_POSITIONS["/"], NODE_POSITIONS["/profile"]],
  ];

  return (
    <group>
      {/* Соединительные линии */}
      {connections.map(([start, end], i) => (
        <Line
          key={i}
          points={[start, end]}
          color="#ffffff"
          lineWidth={0.5}
          opacity={0.2}
          transparent
        />
      ))}

      {/* Выделить активный путь */}
      {activePath && activePath.length > 1 &&
        activePath.slice(0, -1).map((step, i) => {
          const from = NODE_POSITIONS[step.url];
          const to = NODE_POSITIONS[activePath[i + 1]?.url];
          if (!from || !to) return null;
          return (
            <Line
              key={`active-${i}`}
              points={[from, to]}
              color="#1a73e8"
              lineWidth={3}
            />
          );
        })
      }

      {/* Узлы разделов */}
      {Object.entries(NODE_POSITIONS).map(([url, pos]) => {
        const labels: Record<string, string> = {
          "/": "Главная",
          "/loans": "Кредиты",
          "/deposits": "Вклады",
          "/payments": "Платежи",
          "/investments": "Инвестиции",
          "/profile": "Профиль",
        };
        return (
          <SectionNode
            key={url}
            label={labels[url] || url}
            position={pos}
            color={NODE_COLORS[url] || "#888"}
            isActive={activeUrls.has(url)}
          />
        );
      })}
    </group>
  );
}
