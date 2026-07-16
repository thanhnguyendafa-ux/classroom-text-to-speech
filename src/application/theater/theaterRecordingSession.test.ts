import assert from 'node:assert/strict';
import test from 'node:test';
import { createTheaterRecordingSession } from './theaterRecordingSession';

test('stops recorder, display stream, microphone, and timer exactly once', () => {
  const events: string[] = [];
  const recorder = { state: 'recording', stop: () => { events.push('recorder-stop'); } } as unknown as MediaRecorder;
  const display = { getTracks: () => [{ stop: () => events.push('display-stop') }] } as unknown as MediaStream;
  const microphone = { getTracks: () => [{ stop: () => events.push('mic-stop') }] } as unknown as MediaStream;
  const session = createTheaterRecordingSession({ recorder, displayStream: display, microphoneStream: microphone, clearTimer: () => events.push('timer-clear'), onStopped: () => events.push('stopped') });
  session.stop();
  session.stop();
  assert.deepEqual(events, ['timer-clear', 'recorder-stop', 'display-stop', 'mic-stop', 'stopped']);
});

test('selects the configured resolution dimensions', () => {
  assert.deepEqual(createTheaterRecordingSession.resolution('480p'), { width: 854, height: 480 });
  assert.deepEqual(createTheaterRecordingSession.resolution('720p'), { width: 1280, height: 720 });
  assert.deepEqual(createTheaterRecordingSession.resolution('1080p'), { width: 1920, height: 1080 });
});
