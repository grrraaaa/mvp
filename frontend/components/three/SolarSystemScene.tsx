"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { SberSolarSystem } from "./SberSolarSystem";
import { useAssistantStore } from "@/store/assistantStore";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { sberTheme } from "@/lib/sber/theme";

function MapLighting() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <hemisphereLight
        args={["#a8e6cf", sberTheme.spaceBg, 0.55]}
      />
      <directionalLight position={[10, 18, 8]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-12, 8, -4]} intensity={0.35} color={sberTheme.greenLight} />
      <pointLight position={[0, 4, 0]} intensity={0.6} color={sberTheme.green} distance={50} />
    </>
  );
}

export function SolarSystemScene() {
  const { navigationPath } = useAssistantStore();
  const frozen = useSolarSystemStore((s) => s.frozen);

  return (
    <Canvas
      camera={{ position: [0, 14, 36], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      shadows
    >
      <color attach="background" args={[sberTheme.spaceBg]} />
      <fog attach="fog" args={[sberTheme.spaceFog, 42, 95]} />

      <Suspense fallback={null}>
        <MapLighting />

        <Stars
          radius={120}
          depth={60}
          count={1800}
          factor={2.2}
          saturation={0.2}
          fade
          speed={0.15}
        />

        <SberSolarSystem activePath={navigationPath} />

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={20}
          maxDistance={55}
          autoRotate={!frozen}
          autoRotateSpeed={0.12}
          maxPolarAngle={Math.PI / 2.1}
          minPolarAngle={Math.PI / 5}
        />
      </Suspense>
    </Canvas>
  );
}
