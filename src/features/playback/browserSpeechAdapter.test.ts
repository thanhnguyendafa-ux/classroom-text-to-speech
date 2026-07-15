import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserSpeechAdapter } from './browserSpeechAdapter';

function createHarness() {
  const spoken: Array<Record<string, unknown>> = [];
  let cancelled = 0;
  let paused = 0;
  let resumed = 0;
  const voices = [
    { name: 'English', lang: 'en-US' },
    { name: 'Vietnamese', lang: 'vi-VN' },
  ] as SpeechSynthesisVoice[];
  const synthesis = {
    getVoices: () => voices,
    speak: (utterance: SpeechSynthesisUtterance) => spoken.push(utterance as unknown as Record<string, unknown>),
    cancel: () => { cancelled += 1; },
    pause: () => { paused += 1; },
    resume: () => { resumed += 1; },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  } as unknown as SpeechSynthesis;
  const adapter = createBrowserSpeechAdapter({
    synthesis,
    createUtterance: (text) => ({ text }) as SpeechSynthesisUtterance,
  });
  return { adapter, spoken, voices, counts: () => ({ cancelled, paused, resumed }) };
}

test('configures language, bounded volume, speed, and preferred voice', () => {
  const { adapter, spoken, voices } = createHarness();
  adapter.speak({ text: 'Xin chào', language: 'vi', speed: 1.25, volume: 3, preferredVoiceName: 'Vietnamese' });
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].lang, 'vi-VN');
  assert.equal(spoken[0].rate, 1.25);
  assert.equal(spoken[0].volume, 1);
  assert.equal(spoken[0].voice, voices[1]);
});

test('falls back to a matching language voice and owns transport controls', () => {
  const { adapter, spoken, voices, counts } = createHarness();
  adapter.speak({ text: 'Hello', language: 'en', speed: 1, volume: 0.5 });
  assert.equal(spoken[0].voice, voices[0]);
  adapter.pause();
  adapter.resume();
  adapter.stop();
  assert.deepEqual(counts(), { cancelled: 1, paused: 1, resumed: 1 });
});
