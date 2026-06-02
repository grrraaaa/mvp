import { create } from "zustand";

const ENABLED_KEY = "sber-assistant-tts";
const VOICE_KEY = "sber-assistant-tts-voice";

function readEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ENABLED_KEY) !== "0";
  } catch {
    return true;
  }
}

function readVoiceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(VOICE_KEY);
  } catch {
    return null;
  }
}

export interface TtsVoiceOption {
  id: string;
  name: string;
  gender?: string | null;
  locale?: string | null;
  preview_audio?: string | null;
}

export interface TtsVoiceGroup {
  id: string;
  label: string;
  voices: TtsVoiceOption[];
}

interface TtsState {
  enabled: boolean;
  serverTts: boolean;
  voiceSelection: boolean;
  voiceId: string | null;
  voiceGroups: TtsVoiceGroup[];
  voicesLoaded: boolean;
  setServerTts: (v: boolean, opts?: { voiceSelection?: boolean; defaultVoice?: string }) => void;
  setVoiceGroups: (groups: TtsVoiceGroup[], defaultVoice: string) => void;
  setVoiceId: (id: string) => void;
  toggleEnabled: () => void;
  setEnabled: (v: boolean) => void;
}

export const useTtsStore = create<TtsState>((set, get) => ({
  enabled: true,
  serverTts: false,
  voiceSelection: false,
  voiceId: null,
  voiceGroups: [],
  voicesLoaded: false,
  setServerTts: (v, opts) => {
    const patch: Partial<TtsState> = { serverTts: v };
    if (opts?.voiceSelection !== undefined) {
      patch.voiceSelection = opts.voiceSelection;
    }
    if (v && opts?.defaultVoice) {
      const saved = readVoiceId();
      if (!saved) {
        patch.voiceId = opts.defaultVoice;
        try {
          localStorage.setItem(VOICE_KEY, opts.defaultVoice);
        } catch {
          /* ignore */
        }
      }
    }
    set(patch);
  },
  setVoiceGroups: (groups, defaultVoice) => {
    const saved = readVoiceId();
    const allIds = new Set(groups.flatMap((g) => g.voices.map((v) => v.id)));
    let voiceId = saved && allIds.has(saved) ? saved : defaultVoice;
    if (!allIds.has(voiceId) && groups[0]?.voices[0]) {
      voiceId = groups[0].voices[0].id;
    }
    try {
      localStorage.setItem(VOICE_KEY, voiceId);
    } catch {
      /* ignore */
    }
    set({ voiceGroups: groups, voiceId, voicesLoaded: true });
  },
  setVoiceId: (id) => {
    try {
      localStorage.setItem(VOICE_KEY, id);
    } catch {
      /* ignore */
    }
    set({ voiceId: id });
  },
  setEnabled: (v) => {
    try {
      localStorage.setItem(ENABLED_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
    set({ enabled: v });
  },
  toggleEnabled: () => {
    const next = !get().enabled;
    get().setEnabled(next);
  },
}));

if (typeof window !== "undefined") {
  const savedVoice = readVoiceId();
  useTtsStore.setState({
    enabled: readEnabled(),
    voiceId: savedVoice,
  });
}
