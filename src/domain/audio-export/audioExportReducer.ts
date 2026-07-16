export type AudioExportStatus = "idle" | "preparing" | "exporting" | "assembling" | "success" | "failure" | "cancelled";
export type AudioExportState = { status: AudioExportStatus; totalUnits: number; completedUnits: number; progressPercent: number; message: string; error: string | null; resultUrl: string | null; urlToRevoke: string | null };
export type AudioExportAction =
  | { type: "started"; totalUnits: number }
  | { type: "unitCompleted"; message: string }
  | { type: "assemblyStarted" }
  | { type: "succeeded"; resultUrl: string }
  | { type: "failed"; error: string }
  | { type: "cancelled" }
  | { type: "reset" };

export const createAudioExportState = (): AudioExportState => ({ status: "idle", totalUnits: 0, completedUnits: 0, progressPercent: 0, message: "", error: null, resultUrl: null, urlToRevoke: null });
const isTerminal = (status: AudioExportStatus) => status === "success" || status === "failure" || status === "cancelled";

export function audioExportReducer(state: AudioExportState, action: AudioExportAction): AudioExportState {
  if (action.type === "reset") return { ...createAudioExportState(), urlToRevoke: state.resultUrl };
  if (action.type === "started") return { ...createAudioExportState(), status: "preparing", totalUnits: Math.max(0, action.totalUnits) };
  if (isTerminal(state.status)) return state;
  switch (action.type) {
    case "unitCompleted": { const completedUnits = Math.min(state.totalUnits, state.completedUnits + 1); return { ...state, status: "exporting", completedUnits, progressPercent: state.totalUnits === 0 ? 0 : Math.round(completedUnits / state.totalUnits * 100), message: action.message }; }
    case "assemblyStarted": return { ...state, status: "assembling", message: action.type };
    case "succeeded": return { ...state, status: "success", progressPercent: 100, resultUrl: action.resultUrl, error: null };
    case "failed": return { ...state, status: "failure", error: action.error };
    case "cancelled": return { ...state, status: "cancelled" };
  }
}
