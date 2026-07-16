import assert from 'node:assert/strict';
import test from 'node:test';
import { createRecordingState, recordingReducer } from './recordingReducer';

test('owns recording lifecycle and resets elapsed time on start', () => {
  const configured = { ...createRecordingState(), elapsedSeconds: 42, error: 'old' };
  const started = recordingReducer(configured, { type: 'started' });
  assert.equal(started.status, 'recording');
  assert.equal(started.elapsedSeconds, 0);
  assert.equal(started.error, null);
  const ticked = recordingReducer(started, { type: 'ticked' });
  assert.equal(ticked.elapsedSeconds, 1);
  const stopped = recordingReducer(ticked, { type: 'stopped' });
  assert.equal(stopped.status, 'idle');
});

test('updates recording configuration through one canonical reducer', () => {
  let state = createRecordingState();
  state = recordingReducer(state, { type: 'resolutionChanged', resolution: '1080p' });
  state = recordingReducer(state, { type: 'microphoneChanged', enabled: true });
  state = recordingReducer(state, { type: 'echoCancellationChanged', disabled: false });
  state = recordingReducer(state, { type: 'currentTabChanged', enabled: false });
  assert.deepEqual({ resolution: state.resolution, includeMicrophone: state.includeMicrophone, disableEchoCancellation: state.disableEchoCancellation, onlyCurrentTab: state.onlyCurrentTab }, { resolution: '1080p', includeMicrophone: true, disableEchoCancellation: false, onlyCurrentTab: false });
});
