export interface AudioSilenceSample { level: number; elapsedSeconds: number; expectingSpeech: boolean; recording: boolean; }
export interface AudioSilenceDecision { abort: boolean; warn: boolean; activeSilenceSeconds: number; }
export function createAudioSilenceMonitor(input: { silenceThreshold?: number; warningThreshold?: number; abortAfterSeconds?: number; warningAfterFrames?: number } = {}) {
  const silenceThreshold = input.silenceThreshold ?? 1; const warningThreshold = input.warningThreshold ?? 2; const abortAfter = input.abortAfterSeconds ?? 3; const warningAfter = input.warningAfterFrames ?? 180; let silenceSeconds = 0; let quietFrames = 0;
  return { sample(value: AudioSilenceSample): AudioSilenceDecision { silenceSeconds = value.expectingSpeech && value.recording && value.level < silenceThreshold ? silenceSeconds + Math.max(0, value.elapsedSeconds) : 0; quietFrames = value.level < warningThreshold ? quietFrames + 1 : 0; return { abort: silenceSeconds >= abortAfter, warn: quietFrames > warningAfter, activeSilenceSeconds: silenceSeconds }; }, reset() { silenceSeconds = 0; quietFrames = 0; } };
}
