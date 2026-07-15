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
