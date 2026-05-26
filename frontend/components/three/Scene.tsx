"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Stars } from "@react-three/drei";
import { Suspense } from "react";
import { AppMap3D } from "./AppMap3D";
import { useAssistantStore } from "@/store/assistantStore";

export function Scene3D() {
  const { navigationPath } = useAssistantStore();

  return (
    <Canvas
      camera={{ position: [0, 8, 14], fov: 55 }}
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        {/* Освещение */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#1a73e8" />

        {/* Фоновые звёзды */}
        <Stars radius={80} depth={30} count={1500} factor={3} fade />

        {/* Карта приложения */}
        <AppMap3D activePath={navigationPath} />

        {/* Управление камерой */}
        <OrbitControls
          enablePan={false}
          minDistance={8}
          maxDistance={25}
          maxPolarAngle={Math.PI / 2.2}
        />

        <Environment preset="night" />
      </Suspense>
    </Canvas>
  );
}
