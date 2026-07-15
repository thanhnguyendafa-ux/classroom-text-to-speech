import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDisplayCaptureConstraints, errorMessage, stopMediaStream } from './mediaCaptureAdapter';

test('builds one typed display capture contract for screen and current tab', () => {
  assert.deepEqual(buildDisplayCaptureConstraints({ width: 1280, height: 720, onlyCurrentTab: false }), {
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  assert.equal(buildDisplayCaptureConstraints({ width: 320, height: 180, onlyCurrentTab: true }).preferCurrentTab, true);
});

test('stops every stream track and normalizes unknown errors', () => {
  let stopped = 0;
  stopMediaStream({ getTracks: () => [{ stop: () => { stopped += 1; } }, { stop: () => { stopped += 1; } }] } as MediaStream);
  assert.equal(stopped, 2);
  assert.equal(errorMessage(new Error('failed')), 'failed');
  assert.equal(errorMessage('failed'), 'failed');
  assert.equal(errorMessage({}), 'Unknown media error');
});
