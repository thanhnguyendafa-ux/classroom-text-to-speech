import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { LessonDraft } from "../../types";
import { LessonConflictError } from "../../domain/lessonRevision";
import { createLessonFingerprint } from "../../features/lesson-editor/lessonEditorStatus";
import { createLesson, updateLesson } from "../../features/cloud-lessons/cloudLessonApi";
import { createLessonPersistenceState, lessonPersistenceReducer, selectLessonPersistenceStatus } from "./lessonPersistenceReducer";
import { persistLesson, persistLessonCopy, type LessonPersistenceRepository } from "./lessonPersistenceService";

export type PersistenceNotification = { type: "success" | "error" | "info"; message: string; description?: string; action?: { label: string; onClick: () => void } };
type ControllerInput = { userId: string | null; draft: LessonDraft; notify: (notification: PersistenceNotification) => void; onCloudChanged: () => void; onNavigateLessons: () => void; onCopyTitle: (title: string) => void; repository?: LessonPersistenceRepository; createId?: () => string };
const defaultRepository: LessonPersistenceRepository = { create: createLesson, update: updateLesson };
const defaultCreateId = () => "lesson-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);

export function useLessonPersistenceController(input: ControllerInput) {
  const [state, dispatch] = useReducer(lessonPersistenceReducer, undefined, createLessonPersistenceState);
  const fingerprint = useMemo(() => createLessonFingerprint(input.draft), [input.draft]);
  const status = selectLessonPersistenceStatus(state, fingerprint);
  const isDirty = state.savedFingerprint !== null && state.savedFingerprint !== fingerprint;
  useEffect(() => { dispatch({ type: "baselineInitialized", fingerprint }); }, [fingerprint]);
  useEffect(() => { if (!isDirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [isDirty]);
  const notifySaved = useCallback((title: string, created: boolean) => input.notify({ type: "success", message: created ? "Đã lưu lên tài khoản đám mây" : "Đã cập nhật bài học", description: "Bài học " + title + " đã được lưu thành công.", action: { label: "Đi tới Bài học", onClick: input.onNavigateLessons } }), [input]);
  const save = useCallback(async () => {
    if (!input.userId) { input.notify({ type: "error", message: "Yêu cầu đăng nhập", description: "Vui lòng đăng nhập để lưu bài học lên đám mây." }); return; }
    const title = input.draft.title.trim();
    if (!title) { input.notify({ type: "error", message: "Thiếu tiêu đề", description: "Vui lòng nhập tiêu đề cho bài giảng." }); return; }
    if (!input.draft.rawText.trim()) { input.notify({ type: "error", message: "Nội dung trống", description: "Nội dung bài học trống, không thể lưu." }); return; }
    dispatch({ type: "saveStarted" });
    try {
      const result = await persistLesson({ userId: input.userId, draft: { ...input.draft, title }, lessonId: state.lessonId, revision: state.revision, createId: input.createId ?? defaultCreateId, repository: input.repository ?? defaultRepository });
      dispatch({ type: "saveSucceeded", lessonId: result.lessonId, revision: result.revision, fingerprint: createLessonFingerprint({ ...input.draft, title }) });
      input.onCloudChanged(); notifySaved(title, result.created);
    } catch (error) {
      if (error instanceof LessonConflictError) { dispatch({ type: "saveConflicted", expectedRevision: error.expectedRevision, currentRevision: error.currentRevision }); input.notify({ type: "error", message: "Bài học đã thay đổi trên thiết bị khác", description: "Bản đang soạn vẫn được giữ nguyên. Hãy tải phiên bản mới nhất hoặc lưu thành bản sao." }); }
      else { dispatch({ type: "saveFailed", error: "Không thể lưu bài giảng. Nội dung đang soạn vẫn được giữ nguyên." }); input.notify({ type: "error", message: "Lỗi lưu trữ", description: "Không thể lưu bài giảng lên đám mây." }); }
    }
  }, [input, notifySaved, state.lessonId, state.revision]);
  const saveAsCopy = useCallback(async () => {
    if (!input.userId) { input.notify({ type: "error", message: "Yêu cầu đăng nhập", description: "Vui lòng đăng nhập để lưu bản sao." }); return; }
    if (!input.draft.rawText.trim()) { input.notify({ type: "error", message: "Nội dung trống", description: "Nội dung bài học trống, không thể lưu." }); return; }
    const title = input.draft.title.trim() + " (Bản sao)"; dispatch({ type: "saveStarted" });
    try { const copiedDraft = { ...input.draft, title, folderId: null }; const result = await persistLessonCopy({ userId: input.userId, draft: copiedDraft, createId: input.createId ?? defaultCreateId, repository: input.repository ?? defaultRepository }); dispatch({ type: "saveSucceeded", lessonId: result.lessonId, revision: result.revision, fingerprint: createLessonFingerprint(copiedDraft) }); input.onCopyTitle(title); input.onCloudChanged(); notifySaved(title, true); }
    catch { dispatch({ type: "saveFailed", error: "Không thể lưu bản sao. Nội dung đang soạn vẫn được giữ nguyên." }); input.notify({ type: "error", message: "Lỗi lưu trữ", description: "Không thể lưu bản sao bài giảng." }); }
  }, [input, notifySaved]);
  const loadSession = useCallback((lessonId: string, revision: number, savedFingerprint: string) => dispatch({ type: "lessonLoaded", lessonId, revision, fingerprint: savedFingerprint }), []);
  const resetSession = useCallback((baselineFingerprint: string) => dispatch({ type: "sessionReset", fingerprint: baselineFingerprint }), []);
  const confirmDiscard = useCallback((message: string) => !isDirty || window.confirm(message), [isDirty]);
  return { lessonId: state.lessonId, revision: state.revision, status, isDirty, isSaving: state.operation === "saving", error: state.error, conflict: state.conflict, save, saveAsCopy, loadSession, resetSession, confirmDiscard };
}
