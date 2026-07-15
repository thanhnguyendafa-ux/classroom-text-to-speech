export type PlaybackMode = 'idle' | 'playing' | 'paused';
export type WaitingType = 'repeat' | 'advance' | null;
export interface WaitingState { isWaiting: boolean; remainingSec: number; itemId: string | null; type: WaitingType; }
export interface PlaybackState { playingItemId: string | null; playingState: PlaybackMode; currentRepeatIndex: number; waitingState: WaitingState; isManualPaused: boolean; }
export const initialPlaybackState: PlaybackState = { playingItemId: null, playingState: 'idle', currentRepeatIndex: 0, waitingState: { isWaiting: false, remainingSec: 0, itemId: null, type: null }, isManualPaused: false };
export type PlaybackAction =
  | { type: 'started'; itemId: string }
  | { type: 'stopped' }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'itemChanged'; itemId: string | null }
  | { type: 'stateChanged'; state: PlaybackMode }
  | { type: 'repeatChanged'; repeatIndex: number }
  | { type: 'waitingChanged'; waitingState: WaitingState }
  | { type: 'waitingUpdated'; update: (previous: WaitingState) => WaitingState }
  | { type: 'manualPauseChanged'; value: boolean }
  | { type: 'reset' };
export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'started': return { ...initialPlaybackState, playingItemId: action.itemId, playingState: 'playing' };
    case 'stopped': return initialPlaybackState;
    case 'paused': return { ...state, playingState: 'paused', isManualPaused: true };
    case 'resumed': return { ...state, playingState: state.playingItemId ? 'playing' : 'idle', isManualPaused: false };
    case 'itemChanged': return { ...state, playingItemId: action.itemId };
    case 'stateChanged': return { ...state, playingState: action.state };
    case 'repeatChanged': return { ...state, currentRepeatIndex: action.repeatIndex };
    case 'waitingChanged': return { ...state, waitingState: action.waitingState };
    case 'waitingUpdated': return { ...state, waitingState: action.update(state.waitingState) };
    case 'manualPauseChanged': return { ...state, isManualPaused: action.value };
    case 'reset': return initialPlaybackState;
  }
}
