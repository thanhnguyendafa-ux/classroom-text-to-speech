import assert from 'node:assert/strict';
import test from 'node:test';
import type { SpeechItem } from '../../types';
import { BrowserCaptureResourceOwner } from './browserCaptureResourceOwner';
import { runBrowserCaptureSession } from './runBrowserCaptureSession';

const item: SpeechItem = { id: '1', text: 'hello', selectedLang: 'auto', detectedLang: 'en', resolvedLang: 'en', repeats: 1 };

test('owns recorder lifecycle around the browser speech sequence', async () => {
  const events: string[] = [];
  const owner = new BrowserCaptureResourceOwner();
  owner.displayStream = { getTracks: () => [{ stop: () => events.push('display-stop') }] } as unknown as MediaStream;
  const session = { recorder: { mimeType: 'audio/webm' } as MediaRecorder, start: () => events.push('start'), stop: () => events.push('stop') };
  await runBrowserCaptureSession({
    owner,
    recorderStream: {} as MediaStream,
    items: [item],
    speed: 1,
    volume: 1,
    voices: [],
    preferredVoiceNames: {},
    defaultPauseSeconds: 0,
    createRecorderSession: (_stream, onBlob) => { void onBlob(new Blob(['audio'])); return session; },
    runSpeechSequence: async () => { events.push('sequence'); },
    onRecordedBlob: async () => { events.push('blob'); },
    onRecorderReady: mimeType => events.push(`ready:${mimeType}`),
    onProgress: () => {}, onRepeat: () => {}, onError: () => {},
    speechSynthesis: {} as SpeechSynthesis,
    createUtterance: text => ({ text }) as SpeechSynthesisUtterance,
    wait: callback => { callback(); return 1; },
  });
  assert.deepEqual(events, ['blob', 'ready:audio/webm', 'start', 'sequence', 'stop', 'display-stop']);
  assert.equal(owner.phase, 'encoding');
  assert.equal(owner.expectingSpeech, false);
});
