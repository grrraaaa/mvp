"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { PlanetThemeId } from "@/lib/sber/planetTexture";
import type { SatelliteDef } from "@/lib/sber/planetMap";
import { isUrlHighlighted } from "@/lib/sber/planetMap";
import {
  TOOLTIP_BODY,
  TOOLTIP_HTML_PROPS,
  TOOLTIP_PLANET_FOOTER,
  TOOLTIP_PLANET_PANEL,
  TOOLTIP_SATELLITE_PANEL,
  TOOLTIP_TITLE,
} from "@/lib/sber/tooltip3d";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { PlanetShape, SatelliteShape } from "./PlanetShapes";

interface Props {
  themeId: PlanetThemeId;
  label: string;
  url: string;
  hint: string;
  color: string;
  emissive: string;
  radius: number;
  speed: number;
  startAngle: number;
  satellites?: SatelliteDef[];
  highlightUrls: Set<string>;
  onHoverChange?: (hint: string | null) => void;
  onNavigate?: (url: string) => void;
}

const THEME_MAP: Record<string, PlanetThemeId> = {
  payments: "payments",
  statement: "insurance",
  salary: "deposits",
  products: "credits",
  services: "investments",
  other: "payments",
  settings: "cards",
  cards: "cards",
  deposits: "deposits",
  credits: "credits",
  investments: "investments",
  insurance: "insurance",
};

function resolveTheme(id: string): PlanetThemeId {
  return THEME_MAP[id] ?? "payments";
}

function usePlanetNavigate(onNavigate?: (url: string) => void) {
  const router = useRouter();
  return (url: string) => {
    if (url.startsWith("/")) {
      router.push(url);
      onNavigate?.(url);
    } else if (url.startsWith("http")) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };
}

const HIT_SIZE = 1.85;
const SAT_HIT_SIZE = 0.88;

export function PlanetLink({
  themeId,
  label,
  url,
  hint,
  color,
  emissive,
  radius,
  speed,
  startAngle,
  satellites = [],
  highlightUrls,
  onHoverChange,
  onNavigate,
}: Props) {
  const navigate = usePlanetNavigate(onNavigate);
  const resolvedTheme = resolveTheme(themeId);
  const orbitRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const orbitAngleRef = useRef(startAngle);
  const bobPhaseRef = useRef(0);
  const elapsedRef = useRef(0);

  /** id наведённого объекта: только он показывает подсказку */
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const frozen = useSolarSystemStore((s) => s.frozen);
  const pauseOffset = useSolarSystemStore((s) => s.pauseOffset);
  const enterHover = useSolarSystemStore((s) => s.enterHover);
  const leaveHover = useSolarSystemStore((s) => s.leaveHover);

  const planetHoverId = `planet:${label}`;
  const planetHovered = hoveredId === planetHoverId;
  const active = isUrlHighlighted(url, highlightUrls);
  const glow = active ? 0.75 : planetHovered ? 0.5 : 0.22;

  useFrame((state, delta) => {
    elapsedRef.current = state.clock.elapsedTime;
    const orbitTime = state.clock.elapsedTime - pauseOffset;

    if (!frozen) {
      orbitAngleRef.current = startAngle + orbitTime * speed;
      bobPhaseRef.current = orbitTime * 0.55 + startAngle;
    }

    const angle = orbitAngleRef.current;
    if (orbitRef.current) {
      orbitRef.current.position.set(
        Math.cos(angle) * radius,
        Math.sin(bobPhaseRef.current) * 0.35,
        Math.sin(angle) * radius
      );
    }

    if (bodyRef.current && !frozen) {
      bodyRef.current.rotation.y += delta * (active ? 0.35 : 0.12);
    }
  });

  const clearHover = () => {
    setHoveredId(null);
    onHoverChange?.(null);
    document.body.style.cursor = "";
  };

  const onPlanetEnter = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    enterHover(elapsedRef.current);
    setHoveredId(planetHoverId);
    onHoverChange?.(hint);
    document.body.style.cursor = "pointer";
  };

  const onPlanetLeave = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    leaveHover(elapsedRef.current);
    clearHover();
  };

  return (
    <group ref={orbitRef}>
      <group ref={bodyRef}>
        <mesh
          onPointerOver={onPlanetEnter}
          onPointerOut={onPlanetLeave}
          onClick={(e) => {
            e.stopPropagation();
            navigate(url);
          }}
        >
          <boxGeometry args={[HIT_SIZE, HIT_SIZE, HIT_SIZE]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <PlanetShape
          themeId={resolvedTheme}
          label={label}
          color={color}
          emissive={emissive}
          glow={glow}
        />

        {planetHovered && (
          <Html position={[0, 1.65, 0]} {...TOOLTIP_HTML_PROPS}>
            <div className={TOOLTIP_PLANET_PANEL}>
              <p className={TOOLTIP_TITLE}>{label}</p>
              <p className={TOOLTIP_BODY}>{hint}</p>
              <p className={TOOLTIP_PLANET_FOOTER}>СберБизнес →</p>
            </div>
          </Html>
        )}
      </group>

      {satellites.map((sat, i) => {
        const satHoverId = `sat:${label}:${sat.label}`;
        const satHovered = hoveredId === satHoverId;
        const satAngle = (i / Math.max(satellites.length, 1)) * Math.PI * 2;
        const satActive = isUrlHighlighted(sat.url, highlightUrls);
        return (
          <group
            key={sat.label}
            position={[Math.cos(satAngle) * 2.2, 0.15 + i * 0.1, Math.sin(satAngle) * 2.2]}
          >
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                enterHover(elapsedRef.current);
                setHoveredId(satHoverId);
                onHoverChange?.(sat.hint);
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                leaveHover(elapsedRef.current);
                clearHover();
              }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(sat.url);
              }}
            >
              <boxGeometry args={[SAT_HIT_SIZE, SAT_HIT_SIZE, SAT_HIT_SIZE]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <SatelliteShape
              themeId={resolvedTheme}
              label={sat.label}
              emissive={emissive}
              glow={satActive ? 0.55 : satHovered ? 0.45 : 0.25}
            />
            {satHovered && (
              <Html position={[0, 0.85, 0]} {...TOOLTIP_HTML_PROPS}>
                <div className={TOOLTIP_SATELLITE_PANEL}>
                  <p className={TOOLTIP_TITLE}>{sat.label}</p>
                  <p className={TOOLTIP_BODY}>{sat.hint}</p>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
