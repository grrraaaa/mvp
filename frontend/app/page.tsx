"use client";

import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { Scene3D } from "@/components/three/Scene";
import { NavigationPanel } from "@/components/navigation/NavigationPanel";
import { useAssistantStore } from "@/store/assistantStore";

export default function HomePage() {
  const { navigationPath } = useAssistantStore();

  return (
    <main className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* 3D-сцена на фоне */}
      <div className="absolute inset-0 z-0">
        <Scene3D />
      </div>

      {/* Навигационный путь */}
      {navigationPath && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
          <NavigationPanel steps={navigationPath} />
        </div>
      )}

      {/* Панель ассистента */}
      <div className="relative z-10 ml-auto w-full max-w-md h-full">
        <AssistantPanel />
      </div>
    </main>
  );
}
