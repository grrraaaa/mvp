"use client";

import { useCallback, useEffect, useRef } from "react";
import { fetchTtsVoices } from "@/lib/api/tts";
import { useTtsStore } from "@/store/ttsStore";

type Theme = "embedded" | "dark";

interface Props {
  theme?: Theme;
  className?: string;
}

function genderLabel(gender?: string | null): string {
  if (gender === "male") return "м";
  if (gender === "female") return "ж";
  return "";
}

export function AssistantVoicePicker({ theme = "embedded", className = "" }: Props) {
  const voiceSelection = useTtsStore((s) => s.voiceSelection);
  const voiceId = useTtsStore((s) => s.voiceId);
  const voiceGroups = useTtsStore((s) => s.voiceGroups);
  const voicesLoaded = useTtsStore((s) => s.voicesLoaded);
  const setVoiceGroups = useTtsStore((s) => s.setVoiceGroups);
  const setVoiceId = useTtsStore((s) => s.setVoiceId);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!voiceSelection || voicesLoaded) return;
    fetchTtsVoices()
      .then((data) => setVoiceGroups(data.groups, data.default_voice))
      .catch(() => {
        /* остаётся голос по умолчанию с бэкенда */
      });
  }, [voiceSelection, voicesLoaded, setVoiceGroups]);

  const playPreview = useCallback(
    (url: string | null | undefined) => {
      if (!url) return;
      if (previewRef.current) {
        previewRef.current.pause();
        previewRef.current = null;
      }
      const audio = new Audio(url);
      previewRef.current = audio;
      void audio.play();
    },
    [],
  );

  if (!voiceSelection || !voicesLoaded || !voiceId || voiceGroups.length === 0) {
    return null;
  }

  const embedded = theme === "embedded";
  const selectClass = embedded
    ? "max-w-[7.5rem] sm:max-w-[9.5rem] h-8 pl-2 pr-6 text-xs rounded border border-[#d0d7dd] bg-white text-[#1f1f22] focus:outline-none focus:ring-1 focus:ring-[#107f8c]"
    : "max-w-[9.5rem] h-8 pl-2 pr-6 text-xs rounded border border-sber-border bg-sber-panel-elevated text-white focus:outline-none focus:ring-1 focus:ring-sber-green";

  const previewBtnClass = embedded
    ? "w-8 h-8 flex items-center justify-center rounded text-[#7d838a] hover:bg-[#f2f4f7] hover:text-[#107f8c]"
    : "w-8 h-8 flex items-center justify-center rounded text-sber-muted hover:bg-sber-green/10 hover:text-sber-green-light";

  const selectedPreview = voiceGroups
    .flatMap((g) => g.voices)
    .find((v) => v.id === voiceId)?.preview_audio;

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      <label className="sr-only" htmlFor="assistant-voice-select">
        Голос ассистента
      </label>
      <select
        id="assistant-voice-select"
        value={voiceId}
        onChange={(e) => setVoiceId(e.target.value)}
        className={selectClass}
        title="Голос озвучки"
        aria-label="Голос озвучки"
      >
        {voiceGroups.map((group) => (
          <optgroup key={group.id} label={group.label}>
            {group.voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {genderLabel(v.gender) ? ` (${genderLabel(v.gender)})` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {selectedPreview ? (
        <button
          type="button"
          className={previewBtnClass}
          onClick={() => playPreview(selectedPreview)}
          aria-label="Прослушать образец голоса"
          title="Образец голоса"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
