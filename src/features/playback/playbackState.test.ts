import assert from 'node:assert/strict';
import test from 'node:test';
import { initialPlaybackState, playbackReducer } from './playbackState';

test('item changes do not implicitly change playback mode', () => {
  const state = playbackReducer(initialPlaybackState, { type: 'itemChanged', itemId: 'line-1' });
  assert.equal(state.playingItemId, 'line-1');
  assert.equal(state.playingState, 'idle');
});

test('functional waiting updates use the latest reducer state', () => {
  const waiting = playbackReducer(initialPlaybackState, { type: 'waitingChanged', waitingState: { isWaiting: true, remainingSec: 2, itemId: 'line-1', type: 'repeat' } });
  const ticked = playbackReducer(waiting, { type: 'waitingUpdated', update: previous => ({ ...previous, remainingSec: previous.remainingSec - 0.1 }) });
  assert.equal(ticked.waitingState.remainingSec, 1.9);
});

test('reset clears all transient playback state atomically', () => {
  const active = playbackReducer(initialPlaybackState, { type: 'stateChanged', state: 'playing' });
  assert.deepEqual(playbackReducer(active, { type: 'reset' }), initialPlaybackState);
});

test('start transition owns the active item and clears stale wait state', () => {
  const state = playbackReducer({ ...initialPlaybackState, isManualPaused: true, waitingState: { isWaiting: true, remainingSec: 2, itemId: 'old', type: 'advance' } }, { type: 'started', itemId: 'line-1' });
  assert.deepEqual(state, { ...initialPlaybackState, playingItemId: 'line-1', playingState: 'playing' });
});

test('stop transition atomically returns playback to idle', () => {
  const state = playbackReducer({ ...initialPlaybackState, playingItemId: 'line-1', playingState: 'paused', currentRepeatIndex: 2 }, { type: 'stopped' });
  assert.deepEqual(state, initialPlaybackState);
});

test('pause and resume transitions preserve the active item', () => {
  const active = playbackReducer(initialPlaybackState, { type: 'started', itemId: 'line-1' });
  const paused = playbackReducer(active, { type: 'paused' });
  const resumed = playbackReducer(paused, { type: 'resumed' });
  assert.equal(paused.playingState, 'paused');
  assert.equal(paused.isManualPaused, true);
  assert.equal(resumed.playingState, 'playing');
  assert.equal(resumed.isManualPaused, false);
  assert.equal(resumed.playingItemId, 'line-1');
});
