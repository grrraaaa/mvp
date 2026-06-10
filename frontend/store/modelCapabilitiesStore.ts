import { create } from "zustand";

interface ModelCapabilitiesState {
  isStaticMesh: boolean;
  hasMorphLip: boolean;
  hasAnimations: boolean;
  headPortraitMode: boolean;
  setCapabilities: (caps: Partial<ModelCapabilitiesState>) => void;
}

const portraitDefault =
  process.env.NEXT_PUBLIC_CHARACTER_HEAD_PORTRAIT === "true";

export const useModelCapabilitiesStore = create<ModelCapabilitiesState>((set) => ({
  isStaticMesh: true,
  hasMorphLip: false,
  hasAnimations: false,
  headPortraitMode: portraitDefault,
  setCapabilities: (caps) => set((s) => ({ ...s, ...caps })),
}));
