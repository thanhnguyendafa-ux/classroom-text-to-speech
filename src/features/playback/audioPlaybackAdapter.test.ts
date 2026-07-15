import assert from 'node:assert/strict';
import test from 'node:test';
import { createAudioPlaybackAdapter } from './audioPlaybackAdapter';

test('applies boosted volume through one owned audio graph', () => {
  const events: string[] = [];
  const source = { connect: () => events.push('source-connect'), disconnect: () => events.push('source-disconnect') };
  const gain = { gain: { setValueAtTime: (value: number) => events.push(`gain-${value}`) }, connect: () => events.push('gain-connect'), disconnect: () => events.push('gain-disconnect') };
  const context = { state: 'running' as const, currentTime: 1, destination: {}, createMediaElementSource: () => source, createGain: () => gain, resume: async () => undefined };
  const adapter = createAudioPlaybackAdapter(() => context);
  const audio = { volume: 0, pause: () => events.push('pause'), play: async () => undefined };

  adapter.attach(audio, 1.5);
  assert.equal(audio.volume, 1);
  assert.deepEqual(events, ['gain-1.5', 'source-connect', 'gain-connect']);
  adapter.stop();
  assert.deepEqual(events.slice(-3), ['pause', 'source-disconnect', 'gain-disconnect']);
});

test('normal volume bypasses Web Audio and resume targets current audio only', async () => {
  let contexts = 0;
  let plays = 0;
  const adapter = createAudioPlaybackAdapter(() => { contexts++; throw new Error('unused'); });
  const audio = { volume: 0, pause: () => undefined, play: async () => { plays++; } };
  adapter.attach(audio, 0.7);
  await adapter.resume();
  assert.equal(audio.volume, 0.7);
  assert.equal(contexts, 0);
  assert.equal(plays, 1);
});

test('attaching another audio stops and releases the previous graph', () => {
  let pauses = 0;
  let disconnects = 0;
  const context = { state: 'running' as const, currentTime: 0, destination: {}, createMediaElementSource: () => ({ connect: () => undefined, disconnect: () => disconnects++ }), createGain: () => ({ gain: { setValueAtTime: () => undefined }, connect: () => undefined, disconnect: () => disconnects++ }), resume: async () => undefined };
  const adapter = createAudioPlaybackAdapter(() => context);
  adapter.attach({ volume: 0, pause: () => pauses++, play: async () => undefined }, 2);
  adapter.attach({ volume: 0, pause: () => pauses++, play: async () => undefined }, 1);
  assert.equal(pauses, 1);
  assert.equal(disconnects, 2);
});
