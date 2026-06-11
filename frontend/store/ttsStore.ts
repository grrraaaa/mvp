import { create } from "zustand";
import { stopTtsPlayback } from "@/lib/tts/playback";

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
  short?: string | null;
  gender?: string | null;
  locale?: string | null;
  tier?: string | null;
  description?: string | null;
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
  defaultVoice: string | null;
  voiceId: string | null;
  voiceGroups: TtsVoiceGroup[];
  voicesLoaded: boolean;
  setServerTts: (v: boolean, opts?: { voiceSelection?: boolean; defaultVoice?: string }) => void;
  setVoiceGroups: (groups: TtsVoiceGroup[], defaultVoice: string) => void;
  setVoiceGroupsFallback: (defaultVoice: string) => void;
  setVoiceId: (id: string) => void;
  toggleEnabled: () => void;
  setEnabled: (v: boolean) => void;
}

export const useTtsStore = create<TtsState>((set, get) => ({
  enabled: true,
  serverTts: false,
  voiceSelection: false,
  defaultVoice: null,
  voiceId: null,
  voiceGroups: [],
  voicesLoaded: false,
  setServerTts: (v, opts) => {
    const patch: Partial<TtsState> = { serverTts: v };
    if (opts?.voiceSelection !== undefined) {
      patch.voiceSelection = opts.voiceSelection;
    }
    if (opts?.defaultVoice) {
      patch.defaultVoice = opts.defaultVoice;
      const current = get().voiceId ?? readVoiceId();
      if (!current) {
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
    if (!allIds.has(voiceId)) {
      voiceId = allIds.has(defaultVoice) ? defaultVoice : groups[0]?.voices[0]?.id ?? defaultVoice;
    }
    try {
      localStorage.setItem(VOICE_KEY, voiceId);
    } catch {
      /* ignore */
    }
    set({ voiceGroups: groups, voiceId, defaultVoice, voicesLoaded: true });
  },
  setVoiceGroupsFallback: (defaultVoice) => {
    const groups: TtsVoiceGroup[] = [
      {
        id: "default",
        label: "Голос",
        voices: [{ id: defaultVoice, name: "По умолчанию" }],
      },
    ];
    const voiceId = get().voiceId ?? readVoiceId() ?? defaultVoice;
    try {
      localStorage.setItem(VOICE_KEY, voiceId);
    } catch {
      /* ignore */
    }
    set({ voiceGroups: groups, voiceId, defaultVoice, voicesLoaded: true });
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
    if (!v) stopTtsPlayback();
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
