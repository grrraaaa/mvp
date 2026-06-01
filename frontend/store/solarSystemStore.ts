import { create } from "zustand";

interface SolarSystemState {
  frozen: boolean;
  hoverDepth: number;
  /** Накопленное «замороженное» время орбиты (с) */
  pauseOffset: number;
  /** elapsedTime в момент первой заморозки текущей серии hover */
  frozenSince: number | null;
  enterHover: (elapsedTime: number) => void;
  leaveHover: (elapsedTime: number) => void;
}

let pendingLeave: ReturnType<typeof setTimeout> | null = null;

export const useSolarSystemStore = create<SolarSystemState>((set) => ({
  frozen: false,
  hoverDepth: 0,
  pauseOffset: 0,
  frozenSince: null,

  enterHover: (elapsedTime) => {
    if (pendingLeave !== null) {
      clearTimeout(pendingLeave);
      pendingLeave = null;
      return;
    }
    set((s) => {
      const hoverDepth = s.hoverDepth + 1;
      return {
        hoverDepth,
        frozen: true,
        frozenSince: s.frozenSince ?? elapsedTime,
      };
    });
  },

  leaveHover: (elapsedTime) => {
    if (pendingLeave !== null) clearTimeout(pendingLeave);
    pendingLeave = setTimeout(() => {
      pendingLeave = null;
      set((s) => {
        const hoverDepth = Math.max(0, s.hoverDepth - 1);
        const stillFrozen = hoverDepth > 0;
        let pauseOffset = s.pauseOffset;
        if (!stillFrozen && s.frozenSince !== null) {
          pauseOffset += elapsedTime - s.frozenSince;
        }
        return {
          hoverDepth,
          frozen: stillFrozen,
          frozenSince: stillFrozen ? s.frozenSince : null,
          pauseOffset,
        };
      });
    }, 0);
  },
}));
