import { useCallback, useReducer, type SetStateAction } from 'react';
import { createRecordingState, recordingReducer, type RecordingResolution } from './recordingReducer';

function resolve<T>(value: SetStateAction<T>, current: T): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(current) : value;
}

export function useRecordingController() {
  const [state, dispatch] = useReducer(recordingReducer, undefined, createRecordingState);
  const setIsRecording = useCallback((value: SetStateAction<boolean>) => dispatch({ type: resolve(value, state.status === 'recording') ? 'started' : 'stopped' }), [state.status]);
  const setRecordingTimeSec = useCallback((value: SetStateAction<number>) => {
    const next = resolve(value, state.elapsedSeconds);
    if (next === state.elapsedSeconds + 1) dispatch({ type: 'ticked' });
  }, [state.elapsedSeconds]);
  const setShowRecordConfig = useCallback((value: SetStateAction<boolean>) => dispatch({ type: 'configVisibilityChanged', visible: resolve(value, state.showConfig) }), [state.showConfig]);
  const setRecordResolution = useCallback((value: SetStateAction<RecordingResolution>) => dispatch({ type: 'resolutionChanged', resolution: resolve(value, state.resolution) }), [state.resolution]);
  const setIncludeMic = useCallback((value: SetStateAction<boolean>) => dispatch({ type: 'microphoneChanged', enabled: resolve(value, state.includeMicrophone) }), [state.includeMicrophone]);
  const setDisableEchoCancellation = useCallback((value: SetStateAction<boolean>) => dispatch({ type: 'echoCancellationChanged', disabled: resolve(value, state.disableEchoCancellation) }), [state.disableEchoCancellation]);
  const setErrorMessage = useCallback((value: SetStateAction<string | null>) => {
    const next = resolve(value, state.error);
    dispatch(next === null ? { type: 'failed', error: '' } : { type: 'failed', error: next });
  }, [state.error]);
  const clearError = useCallback(() => dispatch({ type: 'failed', error: '' }), []);
  const setOnlyCurrentTab = useCallback((value: SetStateAction<boolean>) => dispatch({ type: 'currentTabChanged', enabled: resolve(value, state.onlyCurrentTab) }), [state.onlyCurrentTab]);
  const setShowRecordingHelp = useCallback((value: SetStateAction<boolean>) => dispatch({ type: 'helpVisibilityChanged', visible: resolve(value, state.showHelp) }), [state.showHelp]);
  const setHideControls = useCallback((value: SetStateAction<boolean>) => dispatch({ type: 'controlsVisibilityChanged', hidden: resolve(value, state.hideControls) }), [state.hideControls]);
  const setIsBottomBarCollapsed = useCallback((value: SetStateAction<boolean>) => dispatch({ type: 'bottomBarChanged', collapsed: resolve(value, state.bottomBarCollapsed) }), [state.bottomBarCollapsed]);
  return {
    state,
    isRecording: state.status === 'recording', recordingTimeSec: state.elapsedSeconds,
    showRecordConfig: state.showConfig, recordResolution: state.resolution,
    includeMic: state.includeMicrophone, disableEchoCancellation: state.disableEchoCancellation,
    errorMessage: state.error || null, onlyCurrentTab: state.onlyCurrentTab,
    showRecordingHelp: state.showHelp, hideControls: state.hideControls,
    isBottomBarCollapsed: state.bottomBarCollapsed,
    setIsRecording, setRecordingTimeSec, setShowRecordConfig, setRecordResolution,
    setIncludeMic, setDisableEchoCancellation, setErrorMessage, clearError,
    setOnlyCurrentTab, setShowRecordingHelp, setHideControls, setIsBottomBarCollapsed,
  };
}
