import assert from 'node:assert/strict';
import test from 'node:test';
import { startBrowserCaptureLevelMonitor } from './browserCaptureLevelMonitor';

test('reports a silent-during-speech abort and cancels its frame', () => {
  let frameCallback: FrameRequestCallback | null = null;
  let cancelledFrame: number | null = null;
  let aborted = false;
  const levels: number[] = [];
  const analyser = { frequencyBinCount: 1, getByteFrequencyData: (data: Uint8Array) => { data[0] = 0; } } as unknown as AnalyserNode;
  const stop = startBrowserCaptureLevelMonitor({
    analyser,
    sample: () => ({ warn: true, abort: true }),
    isCancelled: () => false,
    isExpectingSpeech: () => true,
    isRecording: () => true,
    now: () => 1000,
    requestFrame: callback => { frameCallback = callback; return 7; },
    cancelFrame: frame => { cancelledFrame = frame; },
    onLevel: level => levels.push(level),
    onWarning: () => {},
    onAbort: () => { aborted = true; },
  });
  frameCallback?.(1000);
  stop();
  assert.deepEqual(levels, [0]);
  assert.equal(aborted, true);
  assert.equal(cancelledFrame, 7);
});
