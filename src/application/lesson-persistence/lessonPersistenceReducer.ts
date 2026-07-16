export type LessonPersistenceStatus = "new" | "dirty" | "saving" | "saved" | "error" | "conflict";

export type LessonPersistenceState = {
  lessonId: string | null;
  revision: number;
  savedFingerprint: string | null;
  operation: "idle" | "saving";
  error: string | null;
  conflict: { expectedRevision: number; currentRevision: number } | null;
};

export type LessonPersistenceAction =
  | { type: "saveStarted" }
  | { type: "saveSucceeded"; lessonId: string; revision: number; fingerprint: string }
  | { type: "saveFailed"; error: string }
  | { type: "saveConflicted"; expectedRevision: number; currentRevision: number }
  | { type: "lessonLoaded"; lessonId: string; revision: number; fingerprint: string }
  | { type: "baselineInitialized"; fingerprint: string }
  | { type: "sessionReset"; fingerprint?: string };

export function createLessonPersistenceState(initial: Partial<LessonPersistenceState> = {}): LessonPersistenceState {
  return {
    lessonId: initial.lessonId ?? null,
    revision: initial.revision ?? 1,
    savedFingerprint: initial.savedFingerprint ?? null,
    operation: initial.operation ?? "idle",
    error: initial.error ?? null,
    conflict: initial.conflict ?? null,
  };
}

export function lessonPersistenceReducer(state: LessonPersistenceState, action: LessonPersistenceAction): LessonPersistenceState {
  switch (action.type) {
    case "saveStarted": return { ...state, operation: "saving", error: null, conflict: null };
    case "saveSucceeded": return { lessonId: action.lessonId, revision: action.revision, savedFingerprint: action.fingerprint, operation: "idle", error: null, conflict: null };
    case "saveFailed": return { ...state, operation: "idle", error: action.error, conflict: null };
    case "saveConflicted": return { ...state, operation: "idle", error: null, conflict: { expectedRevision: action.expectedRevision, currentRevision: action.currentRevision } };
    case "lessonLoaded": return createLessonPersistenceState({ lessonId: action.lessonId, revision: action.revision, savedFingerprint: action.fingerprint });
    case "baselineInitialized": return state.savedFingerprint === null ? { ...state, savedFingerprint: action.fingerprint } : state;
    case "sessionReset": return createLessonPersistenceState({ savedFingerprint: action.fingerprint });
  }
}

export function selectLessonPersistenceStatus(state: LessonPersistenceState, currentFingerprint: string): LessonPersistenceStatus {
  if (state.operation === "saving") return "saving";
  if (state.conflict) return "conflict";
  if (state.error) return "error";
  if (state.savedFingerprint !== null && state.savedFingerprint !== currentFingerprint) return "dirty";
  return state.lessonId ? "saved" : "new";
}
