import type { SpeechItem } from "../../types";

export type AudioExportTimelineUnit =
  | { type: "speech"; itemId: string; iteration: number }
  | { type: "pause"; durationMs: number };

const normalizeRepeats = (value: number): number => Number.isFinite(value) && value > 0 ? Math.max(1, Math.floor(value)) : 1;
const normalizePauseMs = (value: number | undefined, fallback: number): number => {
  const seconds = value === undefined ? fallback : value;
  return Number.isFinite(seconds) ? Math.max(0, Math.round(seconds * 1000)) : 0;
};

export function buildAudioExportTimeline(items: readonly SpeechItem[], defaultPauseSeconds: number): AudioExportTimelineUnit[] {
  return items.flatMap(item => {
    const pause = { type: "pause" as const, durationMs: normalizePauseMs(item.delaySec, defaultPauseSeconds) };
    return Array.from({ length: normalizeRepeats(item.repeats) }, (_, index) => [
      { type: "speech" as const, itemId: item.id, iteration: index + 1 },
      pause,
    ]).flat();
  });
}
