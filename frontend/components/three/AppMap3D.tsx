"use client";

import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { NavigationStep } from "@/store/assistantStore";
import { sberTheme } from "@/lib/sber/theme";
import { PlanetNode } from "./PlanetNode";

const NODE_POSITIONS: Record<string, THREE.Vector3> = {
  "/": new THREE.Vector3(0, 0, 0),
  "/loans": new THREE.Vector3(-4, 0, -3),
  "/deposits": new THREE.Vector3(4, 0, -3),
  "/payments": new THREE.Vector3(-4, 0, 3),
  "/investments": new THREE.Vector3(4, 0, 3),
  "/profile": new THREE.Vector3(0, 0, 4.5),
};

const NODE_INFO: Record<string, { label: string; color: string }> = {
  "/": { label: "Главная", color: sberTheme.planet.home },
  "/loans": { label: "Кредиты", color: sberTheme.planet.loans },
  "/deposits": { label: "Вклады", color: sberTheme.planet.deposits },
  "/payments": { label: "Платежи", color: sberTheme.planet.payments },
  "/investments": { label: "Инвестиции", color: sberTheme.planet.investments },
  "/profile": { label: "Профиль", color: sberTheme.planet.profile },
};

const CONNECTIONS: [string, string][] = [
  ["/", "/loans"],
  ["/", "/deposits"],
  ["/", "/payments"],
  ["/", "/investments"],
  ["/", "/profile"],
];

interface Props {
  activePath?: NavigationStep[] | null;
}

export function AppMap3D({ activePath }: Props) {
  const activeUrls = new Set(activePath?.map((s) => s.url) ?? []);

  return (
    <group>
      {CONNECTIONS.map(([from, to], i) => {
        const a = NODE_POSITIONS[from];
        const b = NODE_POSITIONS[to];
        const isActive = activeUrls.has(from) && activeUrls.has(to);
        return (
          <Line
            key={i}
            points={[a, b]}
            color={isActive ? sberTheme.greenLight : "#1a4d2e"}
            lineWidth={isActive ? 2.5 : 0.6}
            transparent
            opacity={isActive ? 0.95 : 0.25}
          />
        );
      })}

      {Object.entries(NODE_POSITIONS).map(([url, pos], index) => {
        const info = NODE_INFO[url];
        return (
          <PlanetNode
            key={url}
            label={info.label}
            color={info.color}
            position={pos}
            isActive={activeUrls.has(url)}
            phase={index * 1.3}
          />
        );
      })}
    </group>
  );
}
