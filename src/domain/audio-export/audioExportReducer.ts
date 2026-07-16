export type AudioExportStatus = "idle" | "processing" | "recording" | "success" | "error";
export type AudioExportState = { status: AudioExportStatus; progressPercent: number; progressText: string; logs: string[]; resultUrl: string | null; error: string | null };
export type AudioExportAction =
  | { type: "phaseChanged"; status: AudioExportStatus }
  | { type: "progressChanged"; percent?: number; text?: string }
  | { type: "logsCleared" }
  | { type: "logAdded"; message: string }
  | { type: "resultChanged"; url: string | null }
  | { type: "failed"; error: string }
  | { type: "reset" };
export const createAudioExportState = (): AudioExportState => ({ status: "idle", progressPercent: 0, progressText: "", logs: [], resultUrl: null, error: null });
export function audioExportReducer(state: AudioExportState, action: AudioExportAction): AudioExportState {
  switch (action.type) {
    case "phaseChanged": return { ...state, status: action.status, error: null };
    case "progressChanged": return { ...state, progressPercent: action.percent === undefined ? state.progressPercent : Math.max(0, Math.min(100, action.percent)), progressText: action.text ?? state.progressText };
    case "logsCleared": return { ...state, logs: [] };
    case "logAdded": return { ...state, logs: [...state.logs, action.message] };
    case "resultChanged": return { ...state, resultUrl: action.url };
    case "failed": return { ...state, status: "error", error: action.error };
    case "reset": return createAudioExportState();
  }
}
