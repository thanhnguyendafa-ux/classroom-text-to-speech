import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareTheaterRecording, selectTheaterRecorderOptions } from './prepareTheaterRecording';

test('falls back to basic microphone constraints and returns one combined stream', async () => {
  const calls: MediaStreamConstraints[] = [];
  const micTrack = {} as MediaStreamTrack;
  const videoTrack = {} as MediaStreamTrack;
  const mic = { getAudioTracks: () => [micTrack], getTracks: () => [micTrack] } as unknown as MediaStream;
  const display = { getAudioTracks: () => [], getVideoTracks: () => [videoTrack], getTracks: () => [videoTrack] } as unknown as MediaStream;
  const added: MediaStreamTrack[] = [];
  const result = await prepareTheaterRecording({
    includeMicrophone: true,
    disableEchoCancellation: false,
    captureDisplay: async () => display,
    displayConstraints: {},
    getUserMedia: async constraints => { calls.push(constraints); if (calls.length === 1) throw new Error('advanced unsupported'); return mic; },
    createCombinedStream: () => ({ addTrack: track => { added.push(track); } }) as unknown as MediaStream,
    createAudioContext: () => { throw new Error('not needed'); },
  });
  assert.equal(result.microphoneStream, mic);
  assert.deepEqual(added, [videoTrack, micTrack]);
  assert.equal(calls.length, 2);
});

test('selects the first supported video recorder mime type', () => {
  assert.deepEqual(selectTheaterRecorderOptions(type => type.includes('vp8')), { mimeType: 'video/webm;codecs=vp8,opus' });
  assert.deepEqual(selectTheaterRecorderOptions(() => false), {});
});
