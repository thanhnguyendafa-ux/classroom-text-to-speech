import assert from 'node:assert/strict';
import test from 'node:test';
import { initialPlaybackState, playbackReducer } from './playbackState';
test('keeps active item and repeat index together', () => { const state = playbackReducer(initialPlaybackState, { type: 'itemStarted', itemId: 'line-1', repeatIndex: 1 }); assert.equal(state.playingItemId, 'line-1'); assert.equal(state.currentRepeatIndex, 1); assert.equal(state.playingState, 'playing'); });
test('resets transient state atomically', () => { const active = playbackReducer(initialPlaybackState, { type: 'itemStarted', itemId: 'line-1', repeatIndex: 2 }); const waiting = playbackReducer(active, { type: 'waitingChanged', waitingState: { isWaiting: true, remainingSec: 2, itemId: 'line-1', type: 'repeat' } }); assert.deepEqual(playbackReducer(waiting, { type: 'reset' }), initialPlaybackState); });
