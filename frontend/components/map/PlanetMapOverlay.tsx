"use client";

import dynamic from "next/dynamic";

const Scene3D = dynamic(
  () => import("@/components/three/Scene").then((m) => m.Scene3D),
  { ssr: false, loading: () => null }
);

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PlanetMapOverlay({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#041810]">
      <header className="flex items-center justify-between px-5 py-3 bg-[#053517]/90 border-b border-sber-green/30 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            🪐
          </span>
          <div>
            <h2 className="text-white font-semibold text-lg">Карта услуг Сбер Банка</h2>
            <p className="text-sber-muted text-xs">
              Планеты — разделы sber-bank.by · наведите и кликните
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/20 transition-colors"
        >
          Закрыть
        </button>
      </header>
      <div className="flex-1 relative min-h-0">
        <Scene3D />
      </div>
    </div>
  );
}
