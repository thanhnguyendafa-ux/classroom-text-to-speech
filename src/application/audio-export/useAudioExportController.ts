import { useCallback, useReducer } from 'react';
import { audioExportReducer, createAudioExportState, type AudioExportStatus } from '../../domain/audio-export/audioExportReducer';
export function useAudioExportController() {
  const [state, dispatch] = useReducer(audioExportReducer, undefined, createAudioExportState);
  const setPhase = useCallback((status: AudioExportStatus) => dispatch({ type: 'phaseChanged', status }), []);
  const setProgress = useCallback((percent: number) => dispatch({ type: 'progressChanged', percent }), []);
  const setProgressText = useCallback((text: string) => dispatch({ type: 'progressChanged', text }), []);
  const clearLogs = useCallback(() => dispatch({ type: 'logsCleared' }), []);
  const appendLog = useCallback((message: string) => dispatch({ type: 'logAdded', message }), []);
  const setResultUrl = useCallback((url: string | null) => dispatch({ type: 'resultChanged', url }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);
  return { state, setPhase, setProgress, setProgressText, clearLogs, appendLog, setResultUrl, reset };
}
