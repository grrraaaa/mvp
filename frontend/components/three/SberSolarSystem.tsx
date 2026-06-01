"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  ORBIT_PLANETS,
  SBER_SUN,
  collectHighlightUrls,
  isUrlHighlighted,
} from "@/lib/sber/planetMap";
import type { PlanetThemeId } from "@/lib/sber/planetTexture";
import { sberTheme } from "@/lib/sber/theme";
import {
  TOOLTIP_BODY,
  TOOLTIP_HTML_PROPS,
  TOOLTIP_ORBIT_HINT,
  TOOLTIP_PANEL,
  TOOLTIP_TITLE,
} from "@/lib/sber/tooltip3d";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { PlanetLink } from "./PlanetLink";
import type { NavigationStep } from "@/store/assistantStore";

interface Props {
  activePath?: NavigationStep[] | null;
}

export function SberSolarSystem({ activePath }: Props) {
  const sunRef = useRef<THREE.Mesh>(null);
  const elapsedRef = useRef(0);
  const [sunHover, setSunHover] = useState(false);
  const [orbitHint, setOrbitHint] = useState<string | null>(null);

  const frozen = useSolarSystemStore((s) => s.frozen);
  const enterHover = useSolarSystemStore((s) => s.enterHover);
  const leaveHover = useSolarSystemStore((s) => s.leaveHover);

  const highlightUrls = useMemo(
    () => collectHighlightUrls(activePath?.map((s) => s.url)),
    [activePath]
  );

  const sunActive = isUrlHighlighted(SBER_SUN.url, highlightUrls);

  useFrame((state, delta) => {
    elapsedRef.current = state.clock.elapsedTime;
    if (frozen || !sunRef.current) return;
    sunRef.current.rotation.y += delta * 0.15;
  });

  return (
    <group>
      {ORBIT_PLANETS.map((p) => (
        <mesh key={`ring-${p.id}`} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[p.orbitRadius - 0.02, p.orbitRadius + 0.02, 128]} />
          <meshBasicMaterial
            color={p.color}
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      <mesh
        ref={sunRef}
        castShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          enterHover(elapsedRef.current);
          setSunHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          leaveHover(elapsedRef.current);
          setSunHover(false);
          document.body.style.cursor = "";
        }}
        onClick={() =>
          window.open(SBER_SUN.url, "_blank", "noopener,noreferrer")
        }
      >
        <sphereGeometry args={[1.25, 64, 64]} />
        <meshStandardMaterial
          color={sberTheme.green}
          emissive={sberTheme.green}
          emissiveIntensity={sunActive ? 1.1 : sunHover ? 0.9 : 0.65}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      <pointLight intensity={2.4} distance={45} color={sberTheme.greenLight} />
      <pointLight position={[0, 3, 0]} intensity={0.8} color={sberTheme.gold} />

      {sunHover && (
        <Html position={[0, 2.45, 0]} {...TOOLTIP_HTML_PROPS}>
          <div className={TOOLTIP_PANEL}>
            <p className={TOOLTIP_TITLE}>{SBER_SUN.label}</p>
            <p className={TOOLTIP_BODY}>{SBER_SUN.hint}</p>
          </div>
        </Html>
      )}

      {ORBIT_PLANETS.map((planet) => (
        <PlanetLink
          key={planet.id}
          themeId={planet.id as PlanetThemeId}
          label={planet.label}
          url={planet.url}
          hint={planet.hint}
          color={planet.color}
          emissive={planet.emissive}
          radius={planet.orbitRadius}
          speed={planet.orbitSpeed}
          startAngle={planet.startAngle}
          satellites={planet.satellites}
          highlightUrls={highlightUrls}
          onHoverChange={(h) => setOrbitHint(h)}
        />
      ))}

      {orbitHint && !sunHover && (
        <Html position={[0, -2.2, 0]} {...TOOLTIP_HTML_PROPS}>
          <p className={TOOLTIP_ORBIT_HINT}>
            Клик — открыть раздел на sber-bank.by
          </p>
        </Html>
      )}
    </group>
  );
}
