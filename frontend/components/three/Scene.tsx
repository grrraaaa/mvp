"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { SberSolarSystem } from "./SberSolarSystem";
import { useAssistantStore } from "@/store/assistantStore";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { sberTheme } from "@/lib/sber/theme";

export function Scene3D() {
  const { navigationPath } = useAssistantStore();
  const frozen = useSolarSystemStore((s) => s.frozen);

  return (
    <Canvas
      camera={{ position: [0, 16, 38], fov: 48 }}
      gl={{ antialias: true, alpha: true }}
      shadows
    >
      <color attach="background" args={[sberTheme.bg]} />
      <fog attach="fog" args={[sberTheme.greenDeep, 38, 85]} />

      <Suspense fallback={null}>
        <ambientLight intensity={0.35} />
        <hemisphereLight
          args={[sberTheme.greenLight, sberTheme.greenDeep, 0.5]}
        />
        <directionalLight position={[8, 14, 6]} intensity={1.1} castShadow />
        <pointLight position={[-8, 6, -6]} intensity={0.5} color={sberTheme.green} />

        <Stars radius={140} depth={70} count={3000} factor={3} fade speed={0.3} />

        <SberSolarSystem activePath={navigationPath} />

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={22}
          maxDistance={52}
          autoRotate={!frozen}
          autoRotateSpeed={0.15}
          maxPolarAngle={Math.PI / 2.05}
          minPolarAngle={Math.PI / 4.5}
        />
      </Suspense>
    </Canvas>
  );
}
