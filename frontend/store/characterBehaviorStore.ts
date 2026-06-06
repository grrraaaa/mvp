import { create } from "zustand";
import { buildLipTimeline } from "@/lib/assistant/lipSync";

export type CharacterAction = "idle" | "think" | "walk" | "talk";
export type WalkPhase = "none" | "to_desk" | "to_home";

interface CharacterBehaviorState {
  action: CharacterAction;
  speechText: string | null;
  walkPhase: WalkPhase;
  pendingSpeech: string | null;
  talkDurationMs: number;
  lipTimeline: number[];
  talkStartedAt: number | null;
  rareWalkSession: boolean;
  emotion: string;
  lipOpenOverride: number | null;

  setAction: (action: CharacterAction) => void;
  setSpeech: (text: string | null) => void;
  setEmotion: (emotion: string) => void;
  startTalk: (text: string, durationMs: number) => void;
  beginRareApproach: (text: string, durationMs: number) => void;
  onWalkComplete: () => void;
  finishTalk: () => void;
}

export const useCharacterBehaviorStore = create<CharacterBehaviorState>((set, get) => ({
  action: "idle",
  speechText: null,
  walkPhase: "none",
  pendingSpeech: null,
  talkDurationMs: 3000,
  lipTimeline: [],
  talkStartedAt: null,
  rareWalkSession: false,
  emotion: "idle",
  lipOpenOverride: null,

  setAction: (action) => set({ action }),
  setSpeech: (speechText) => set({ speechText }),
  setEmotion: (emotion) => set({ emotion }),

  startTalk: (text, durationMs) =>
    set({
      action: "talk",
      speechText: text,
      talkDurationMs: durationMs,
      lipTimeline: buildLipTimeline(text, durationMs),
      talkStartedAt: performance.now(),
      walkPhase: "none",
      pendingSpeech: null,
    }),

  beginRareApproach: (text, durationMs) =>
    set({
      action: "walk",
      walkPhase: "to_desk",
      pendingSpeech: text,
      talkDurationMs: durationMs,
      speechText: null,
      talkStartedAt: null,
      lipTimeline: [],
      rareWalkSession: true,
    }),

  onWalkComplete: () => {
    const s = get();
    if (s.walkPhase === "to_desk" && s.pendingSpeech) {
      const text = s.pendingSpeech;
      set({
        walkPhase: "none",
        pendingSpeech: null,
        action: "talk",
        speechText: text,
        lipTimeline: buildLipTimeline(text, s.talkDurationMs),
        talkStartedAt: performance.now(),
      });
      return;
    }
    if (s.walkPhase === "to_home") {
      set({ walkPhase: "none", action: "idle", rareWalkSession: false });
    }
  },

  finishTalk: () => {
    const s = get();
    if (s.rareWalkSession) {
      set({
        action: "walk",
        walkPhase: "to_home",
        speechText: null,
        talkStartedAt: null,
        lipTimeline: [],
      });
    } else {
      set({
        action: "idle",
        speechText: null,
        talkStartedAt: null,
        lipTimeline: [],
      });
    }
  },
}));

/** ~22% ответов — медленный выход к зоне ответа */
export const RARE_WALK_CHANCE = 0.22;
