import assert from 'node:assert/strict';
import test from 'node:test';
import { processBrowserRecording } from './browserRecordingProcessor';

test('rejects an empty recording before decoding', async () => {
  await assert.rejects(() => processBrowserRecording({
    blob: new Blob(),
    decode: async () => { throw new Error('must not decode'); },
    encode: () => { throw new Error('must not encode'); },
    createObjectUrl: () => 'blob:unused',
  }), /empty-recording/);
});

test('falls back to the source recording when decoding is unsupported', async () => {
  const result = await processBrowserRecording({
    blob: new Blob(['webm'], { type: 'audio/webm' }),
    decode: async () => { throw new Error('unsupported codec'); },
    encode: () => { throw new Error('must not encode'); },
    createObjectUrl: blob => `blob:${blob.type}`,
  });
  assert.deepEqual(result, { kind: 'source-fallback', url: 'blob:audio/webm', decodeError: 'unsupported codec' });
});

test('returns encoded audio and quality metrics after decoding', async () => {
  const decoded = {} as AudioBuffer;
  const encodedBlob = new Blob(['mp3'], { type: 'audio/mpeg' });
  const metrics = { peak: 0.7, rms: 0.2, clippingRatio: 0, duration: 1.5, isLikelyClipped: false };
  const result = await processBrowserRecording({
    blob: new Blob(['webm'], { type: 'audio/webm' }),
    decode: async () => decoded,
    encode: audio => { assert.equal(audio, decoded); return { blob: encodedBlob, metrics, sampleRate: 24000 }; },
    createObjectUrl: blob => `blob:${blob.type}`,
  });
  assert.deepEqual(result, { kind: 'encoded', url: 'blob:audio/mpeg', metrics });
});

