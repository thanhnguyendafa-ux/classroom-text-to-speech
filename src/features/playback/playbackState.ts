export type PlaybackMode = 'idle' | 'playing' | 'paused';
export type WaitingType = 'repeat' | 'advance' | null;
export interface WaitingState { isWaiting: boolean; remainingSec: number; itemId: string | null; type: WaitingType; }
export interface PlaybackState { playingItemId: string | null; playingState: PlaybackMode; currentRepeatIndex: number; waitingState: WaitingState; isManualPaused: boolean; }
export const initialPlaybackState: PlaybackState = { playingItemId: null, playingState: 'idle', currentRepeatIndex: 0, waitingState: { isWaiting: false, remainingSec: 0, itemId: null, type: null }, isManualPaused: false };
export type PlaybackAction =
  | { type: 'itemStarted'; itemId: string; repeatIndex: number }
  | { type: 'stateChanged'; state: PlaybackMode }
  | { type: 'repeatChanged'; repeatIndex: number }
  | { type: 'waitingChanged'; waitingState: WaitingState }
  | { type: 'manualPauseChanged'; value: boolean }
  | { type: 'reset' };
export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'itemStarted': return { ...state, playingItemId: action.itemId, currentRepeatIndex: action.repeatIndex, playingState: 'playing', isManualPaused: false };
    case 'stateChanged': return { ...state, playingState: action.state };
    case 'repeatChanged': return { ...state, currentRepeatIndex: action.repeatIndex };
    case 'waitingChanged': return { ...state, waitingState: action.waitingState };
    case 'manualPauseChanged': return { ...state, isManualPaused: action.value };
    case 'reset': return initialPlaybackState;
  }
}
