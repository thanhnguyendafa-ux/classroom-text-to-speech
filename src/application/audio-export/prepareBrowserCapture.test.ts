import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareBrowserCapture } from './prepareBrowserCapture';

test('rejects capture without audio and releases acquired streams', async () => {
  let stopped = 0;
  const stream = {
    getAudioTracks: () => [],
    getTracks: () => [{ stop: () => { stopped += 1; } }],
  } as unknown as MediaStream;
  await assert.rejects(() => prepareBrowserCapture({
    source: 'system',
    displayConstraints: {},
    captureDisplay: async () => stream,
    getUserMedia: async () => { throw new Error('not used'); },
    createAudioContext: () => { throw new Error('must not create context'); },
    runPreflight: async () => ({ detected: true, peak: 1 }),
    createMix: () => { throw new Error('must not mix'); },
    cancelSpeech: () => {},
    speakProbe: () => {},
  }), /capture-audio-unavailable/);
  assert.equal(stopped, 1);
});

test('returns the canonical streams, analyser, and recorder stream', async () => {
  const track = {} as MediaStreamTrack;
  const stream = { getAudioTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
  const recorderStream = {} as MediaStream;
  const analyser = { fftSize: 0 } as AnalyserNode;
  const context = {
    state: 'running',
    createAnalyser: () => analyser,
  } as unknown as AudioContext;
  const result = await prepareBrowserCapture({
    source: 'mic',
    displayConstraints: {},
    captureDisplay: async () => { throw new Error('not used'); },
    getUserMedia: async () => stream,
    createAudioContext: () => context,
    runPreflight: async () => { throw new Error('not used'); },
    createMix: () => ({ recorderStream, displaySource: null, microphoneSource: null }),
    cancelSpeech: () => {},
    speakProbe: () => {},
  });
  assert.equal(result.microphone, stream);
  assert.equal(result.recorderStream, recorderStream);
  assert.equal(result.analyser, analyser);
  assert.equal(result.hasDisplayAudio, false);
  assert.equal(analyser.fftSize, 256);
});
