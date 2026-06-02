"use client";

import dynamic from "next/dynamic";
import { IconClose, IconPlanet } from "@/components/sbbol/SbbolIcons";

const SolarSystemScene = dynamic(
  () => import("@/components/three/SolarSystemScene").then((m) => m.SolarSystemScene),
  { ssr: false, loading: () => null }
);

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PlanetMapOverlay({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#060f1a]">
      <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[#0a1f18]/95 to-[#0d2835]/95 border-b border-white/10 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#107f8c]/20 border border-[#107f8c]/40">
            <IconPlanet className="w-7 h-7" />
          </span>
          <div className="min-w-0">
            <h2 className="text-white font-semibold text-base sm:text-lg truncate">
              Карта разделов СберБизнес
            </h2>
            <p className="text-[#9cb8a8] text-xs sm:text-sm truncate">
              Наведите на планету · клик — переход в раздел
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition-colors"
          aria-label="Закрыть карту"
        >
          <IconClose className="w-6 h-6" stroke="#ffffff" />
        </button>
      </header>
      <div className="flex-1 relative min-h-0">
        <SolarSystemScene onNavigate={onClose} />
      </div>
    </div>
  );
}
