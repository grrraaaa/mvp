/** Простой таймлайн открытия рта по тексту (псевдо-фонемы). */
const VOWELS = /[aeiouyаеёиоуыэюя]/i;

export function buildLipTimeline(text: string, durationMs: number, fps = 28): number[] {
  const units: number[] = [];

  for (const ch of text) {
    if (ch === " ") {
      units.push(0.08);
      continue;
    }
    if (VOWELS.test(ch)) {
      units.push(0.75 + Math.random() * 0.2);
    } else if (/[.,!?;:]/.test(ch)) {
      units.push(0.05);
    } else {
      units.push(0.22 + Math.random() * 0.18);
    }
  }

  if (units.length === 0) units.push(0.15, 0.4, 0.15);

  const frameCount = Math.max(8, Math.ceil((durationMs / 1000) * fps));
  const result: number[] = [];

  for (let i = 0; i < frameCount; i++) {
    const u = (i / frameCount) * units.length;
    const idx = Math.min(units.length - 1, Math.floor(u));
    const next = Math.min(units.length - 1, idx + 1);
    const blend = u - idx;
    result.push(units[idx] * (1 - blend) + units[next] * blend);
  }

  return result;
}

export function lipOpennessAt(
  timeline: number[],
  talkStartedAt: number,
  fps = 28
): number {
  if (!talkStartedAt || timeline.length === 0) return 0;
  const frame = Math.floor(((performance.now() - talkStartedAt) / 1000) * fps);
  return timeline[Math.min(frame, timeline.length - 1)] ?? 0;
}
