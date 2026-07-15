import { useCallback, useReducer } from 'react';
import { initialPlaybackState, playbackReducer, type PlaybackMode, type WaitingState } from './playbackState';

export function usePlaybackState() {
  const [playback, dispatch] = useReducer(playbackReducer, initialPlaybackState);
  const setPlayingItemId = useCallback((itemId: string | null) => dispatch({ type: 'itemChanged', itemId }), []);
  const setPlayingState = useCallback((state: PlaybackMode) => dispatch({ type: 'stateChanged', state }), []);
  const setCurrentRepeatIndex = useCallback((repeatIndex: number) => dispatch({ type: 'repeatChanged', repeatIndex }), []);
  const setWaitingState = useCallback((next: WaitingState | ((previous: WaitingState) => WaitingState)) => {
    if (typeof next === 'function') dispatch({ type: 'waitingUpdated', update: next });
    else dispatch({ type: 'waitingChanged', waitingState: next });
  }, []);
  const setIsManualPaused = useCallback((value: boolean) => dispatch({ type: 'manualPauseChanged', value }), []);
  const resetPlayback = useCallback(() => dispatch({ type: 'reset' }), []);
  return { ...playback, setPlayingItemId, setPlayingState, setCurrentRepeatIndex, setWaitingState, setIsManualPaused, resetPlayback };
}
