import type { SpeechItem } from "../../types";
import { buildAudioExportTimeline } from "../../domain/audio-export/audioExportTimeline";
import { concatenatePcm, createSilence } from "./audioExportAssembler";

export class PremiumAudioExportCancelledError extends Error { constructor() { super("Audio export cancelled"); this.name = "PremiumAudioExportCancelledError"; } }
export interface PremiumAudioExportInput { items: readonly SpeechItem[]; defaultPauseSeconds: number; sampleRate: number; resolvePcm: (item: SpeechItem) => Promise<Int16Array>; isCancelled?: () => boolean; onItemProgress?: (completed: number, total: number, item: SpeechItem) => void; }

export async function runPremiumAudioExport(input: PremiumAudioExportInput): Promise<Int16Array> {
  const pcmById = new Map<string, Int16Array>();
  for (let index = 0; index < input.items.length; index += 1) {
    if (input.isCancelled?.()) throw new PremiumAudioExportCancelledError();
    const item = input.items[index];
    pcmById.set(item.id, await input.resolvePcm(item));
    input.onItemProgress?.(index + 1, input.items.length, item);
  }
  if (input.isCancelled?.()) throw new PremiumAudioExportCancelledError();
  const timeline = buildAudioExportTimeline(input.items, input.defaultPauseSeconds);
  const buffers = timeline.map(unit => unit.type === "speech" ? pcmById.get(unit.itemId)! : createSilence(input.sampleRate, unit.durationMs / 1000));
  return concatenatePcm(buffers);
}
