"use client";

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
}

function openUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
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
}: Props) {
  const orbitRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const orbitAngleRef = useRef(startAngle);
  const bobPhaseRef = useRef(0);
  const elapsedRef = useRef(0);

  const [hovered, setHovered] = useState(false);
  const frozen = useSolarSystemStore((s) => s.frozen);
  const pauseOffset = useSolarSystemStore((s) => s.pauseOffset);
  const enterHover = useSolarSystemStore((s) => s.enterHover);
  const leaveHover = useSolarSystemStore((s) => s.leaveHover);

  const active = isUrlHighlighted(url, highlightUrls);
  const glow = active ? 0.75 : hovered ? 0.5 : 0.22;

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

  const onEnter = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    enterHover(elapsedRef.current);
    setHovered(true);
    onHoverChange?.(hint);
    document.body.style.cursor = "pointer";
  };

  const onLeave = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    leaveHover(elapsedRef.current);
    setHovered(false);
    onHoverChange?.(null);
    document.body.style.cursor = "";
  };

  return (
    <group ref={orbitRef}>
      <group
        ref={bodyRef}
        onPointerOver={onEnter}
        onPointerOut={onLeave}
        onClick={(e) => {
          e.stopPropagation();
          openUrl(url);
        }}
      >
        <PlanetShape
          themeId={themeId}
          label={label}
          color={color}
          emissive={emissive}
          glow={glow}
        />

        {/* Зона наведения */}
        <mesh visible={false}>
          <boxGeometry args={[HIT_SIZE, HIT_SIZE, HIT_SIZE]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {satellites.map((sat, i) => (
          <SatelliteLink
            key={`${sat.label}-${i}`}
            sat={sat}
            themeId={themeId}
            emissive={emissive}
            index={i}
            total={satellites.length}
            parentActive={active}
            highlightUrls={highlightUrls}
            onSatelliteEnter={() => setHovered(false)}
          />
        ))}
      </group>

      {hovered && (
        <Html position={[0, 1.05, 0]} {...TOOLTIP_HTML_PROPS}>
          <div className={TOOLTIP_PLANET_PANEL}>
            <p className={TOOLTIP_TITLE}>{label}</p>
            <p className={TOOLTIP_BODY}>{hint}</p>
            <p className={TOOLTIP_PLANET_FOOTER}>sber-bank.by ↗</p>
          </div>
        </Html>
      )}
    </group>
  );
}

function SatelliteLink({
  sat,
  themeId,
  emissive,
  index,
  total,
  parentActive,
  highlightUrls,
  onSatelliteEnter,
}: {
  sat: SatelliteDef;
  themeId: PlanetThemeId;
  emissive: string;
  index: number;
  total: number;
  parentActive: boolean;
  highlightUrls: Set<string>;
  onSatelliteEnter: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const satAngleRef = useRef((index / Math.max(total, 1)) * Math.PI * 2);
  const bobRef = useRef(0);
  const elapsedRef = useRef(0);

  const [hovered, setHovered] = useState(false);
  const frozen = useSolarSystemStore((s) => s.frozen);
  const pauseOffset = useSolarSystemStore((s) => s.pauseOffset);
  const enterHover = useSolarSystemStore((s) => s.enterHover);
  const leaveHover = useSolarSystemStore((s) => s.leaveHover);

  const active = parentActive || isUrlHighlighted(sat.url, highlightUrls);
  const glow = active ? 0.65 : hovered ? 0.45 : 0.18;
  const satOrbit = 2.35;

  useFrame((state) => {
    elapsedRef.current = state.clock.elapsedTime;
    const orbitTime = state.clock.elapsedTime - pauseOffset;

    if (!frozen) {
      satAngleRef.current =
        (index / Math.max(total, 1)) * Math.PI * 2 + orbitTime * 0.35;
      bobRef.current = orbitTime * 2 + index;
    }

    if (!ref.current) return;
    const a = satAngleRef.current;
    ref.current.position.set(
      Math.cos(a) * satOrbit,
      Math.sin(bobRef.current) * 0.15,
      Math.sin(a) * satOrbit
    );
  });

  return (
    <group
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation();
        enterHover(elapsedRef.current);
        onSatelliteEnter();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        leaveHover(elapsedRef.current);
        setHovered(false);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        openUrl(sat.url);
      }}
    >
      <SatelliteShape
        themeId={themeId}
        label={sat.label}
        emissive={emissive}
        glow={glow}
      />
      <mesh visible={false}>
        <boxGeometry args={[SAT_HIT_SIZE, SAT_HIT_SIZE, SAT_HIT_SIZE]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {hovered && (
        <Html {...TOOLTIP_HTML_PROPS}>
          <div className={TOOLTIP_SATELLITE_PANEL}>
            <p className={TOOLTIP_BODY}>{sat.hint}</p>
          </div>
        </Html>
      )}
    </group>
  );
}
