export interface BrowserCaptureLevelMonitorInput {
  analyser: AnalyserNode;
  sample: (input: { level: number; elapsedSeconds: number; expectingSpeech: boolean; recording: boolean }) => { warn: boolean; abort: boolean };
  isCancelled: () => boolean;
  isExpectingSpeech: () => boolean;
  isRecording: () => boolean;
  now: () => number;
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (frame: number) => void;
  onLevel: (level: number) => void;
  onWarning: (warning: boolean) => void;
  onAbort: () => void;
}

export function startBrowserCaptureLevelMonitor(input: BrowserCaptureLevelMonitorInput): () => void {
  const data = new Uint8Array(input.analyser.frequencyBinCount);
  let lastCheckTime = input.now();
  let frame: number | null = null;
  let stopped = false;
  const update = () => {
    if (stopped || input.isCancelled()) return;
    input.analyser.getByteFrequencyData(data);
    let sum = 0;
    for (const value of data) sum += value;
    const level = data.length ? sum / data.length : 0;
    input.onLevel(level);
    const now = input.now();
    const elapsedSeconds = (now - lastCheckTime) / 1000;
    lastCheckTime = now;
    const decision = input.sample({ level, elapsedSeconds, expectingSpeech: input.isExpectingSpeech(), recording: input.isRecording() });
    input.onWarning(decision.warn);
    if (decision.abort) {
      input.onAbort();
      return;
    }
    frame = input.requestFrame(update);
  };
  frame = input.requestFrame(update);
  return () => {
    stopped = true;
    if (frame !== null) input.cancelFrame(frame);
    frame = null;
  };
}
