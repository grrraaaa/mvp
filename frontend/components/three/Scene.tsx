"use client";

<<<<<<< HEAD
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
=======
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
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
      </Suspense>
    </Canvas>
  );
}
