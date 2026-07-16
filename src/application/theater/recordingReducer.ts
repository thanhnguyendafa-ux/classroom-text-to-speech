export type RecordingStatus = 'idle' | 'recording';
export type RecordingResolution = '480p' | '720p' | '1080p';
export interface RecordingState {
  status: RecordingStatus;
  elapsedSeconds: number;
  resolution: RecordingResolution;
  includeMicrophone: boolean;
  disableEchoCancellation: boolean;
  onlyCurrentTab: boolean;
  showConfig: boolean;
  showHelp: boolean;
  hideControls: boolean;
  bottomBarCollapsed: boolean;
  error: string | null;
}
export type RecordingAction =
  | { type: 'started' }
  | { type: 'stopped' }
  | { type: 'ticked' }
  | { type: 'failed'; error: string }
  | { type: 'resolutionChanged'; resolution: RecordingResolution }
  | { type: 'microphoneChanged'; enabled: boolean }
  | { type: 'echoCancellationChanged'; disabled: boolean }
  | { type: 'currentTabChanged'; enabled: boolean }
  | { type: 'configVisibilityChanged'; visible: boolean }
  | { type: 'helpVisibilityChanged'; visible: boolean }
  | { type: 'controlsVisibilityChanged'; hidden: boolean }
  | { type: 'bottomBarChanged'; collapsed: boolean };
export function createRecordingState(): RecordingState {
  return { status: 'idle', elapsedSeconds: 0, resolution: '720p', includeMicrophone: false, disableEchoCancellation: true, onlyCurrentTab: true, showConfig: false, showHelp: false, hideControls: false, bottomBarCollapsed: false, error: null };
}
export function recordingReducer(state: RecordingState, action: RecordingAction): RecordingState {
  switch (action.type) {
    case 'started': return { ...state, status: 'recording', elapsedSeconds: 0, error: null };
    case 'stopped': return { ...state, status: 'idle' };
    case 'ticked': return state.status === 'recording' ? { ...state, elapsedSeconds: state.elapsedSeconds + 1 } : state;
    case 'failed': return { ...state, status: 'idle', error: action.error };
    case 'resolutionChanged': return { ...state, resolution: action.resolution };
    case 'microphoneChanged': return { ...state, includeMicrophone: action.enabled };
    case 'echoCancellationChanged': return { ...state, disableEchoCancellation: action.disabled };
    case 'currentTabChanged': return { ...state, onlyCurrentTab: action.enabled };
    case 'configVisibilityChanged': return { ...state, showConfig: action.visible };
    case 'helpVisibilityChanged': return { ...state, showHelp: action.visible };
    case 'controlsVisibilityChanged': return { ...state, hideControls: action.hidden };
    case 'bottomBarChanged': return { ...state, bottomBarCollapsed: action.collapsed };
  }
}
