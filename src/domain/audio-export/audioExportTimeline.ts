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
  const occurrences = items.flatMap(item => Array.from({ length: normalizeRepeats(item.repeats) }, (_, index) => ({ itemId: item.id, iteration: index + 1, pauseMs: normalizePauseMs(item.delaySec, defaultPauseSeconds) })));
  const timeline: AudioExportTimelineUnit[] = [];
  occurrences.forEach((occurrence, index) => {
    timeline.push({ type: "speech", itemId: occurrence.itemId, iteration: occurrence.iteration });
    if (index < occurrences.length - 1 && occurrence.pauseMs > 0) timeline.push({ type: "pause", durationMs: occurrence.pauseMs });
  });
  return timeline;
}
