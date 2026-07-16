import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { createBrowserLocalLibraryRepository, type LocalLibrarySnapshot, type SavedFolder, type SavedLesson } from "../../features/lessons/localLibraryRepository";
import { createDefaultLocalLibrarySeed } from "../../features/lessons/localLibrarySeed";
import { listFolders, listLessons, type CloudFolder, type CloudLesson } from "../../features/cloud-lessons/cloudLessonApi";
import { projectCloudLibrary, projectLocalLibrary } from "../../domain/library/libraryProjection";
import { createLibraryState, libraryReducer, selectFilteredLibrary } from "../../domain/library/libraryReducer";
import type { LibraryDisplayFolder, LibraryDisplayLesson, LibrarySource } from "../../features/lessons/libraryDisplayModel";

type Input = { userId: string | null; initialSource?: LibrarySource; refreshVersion?: number; onError: (message: string) => void };
const displayToSavedLesson = (lesson: LibraryDisplayLesson): SavedLesson => ({ id: lesson.id, schemaVersion: lesson.schemaVersion, revision: lesson.revision, title: lesson.title, rawText: lesson.rawText, speechList: lesson.speechList, settings: lesson.settings, folderId: lesson.folderId, createdAt: lesson.createdAt, updatedAt: lesson.updatedAt });

export function useLessonLibraryDataController(input: Input) {
  const [state, dispatch] = useReducer(libraryReducer, { source: input.initialSource ?? "cloud" }, createLibraryState);
  const localRepository = useMemo(() => createBrowserLocalLibraryRepository(input.userId ?? "global"), [input.userId]);
  const localRawRef = useRef<LocalLibrarySnapshot>({ folders: [], uncategorized: [] });
  const loadLocal = useCallback(() => { const loaded = localRepository.loadWithLegacyMigration(); let snapshot = loaded.snapshot; if (!localRepository.isSeeded() && !loaded.migrated && snapshot.folders.length === 0 && snapshot.uncategorized.length === 0) { snapshot = createDefaultLocalLibrarySeed(Date.now()); localRepository.save(snapshot); } localRawRef.current = snapshot; const projected = projectLocalLibrary(snapshot.folders, snapshot.uncategorized); dispatch({ type: "snapshotLoaded", source: "local", ...projected }); }, [localRepository]);
  const refreshCloud = useCallback(async () => { if (!input.userId) return; dispatch({ type: "loadStarted", source: "cloud" }); try { const [folders, lessons] = await Promise.all([listFolders(input.userId), listLessons(input.userId)]); dispatch({ type: "snapshotLoaded", source: "cloud", ...projectCloudLibrary(folders ?? [], lessons ?? []) }); } catch { input.onError("Không thể tải thư viện đám mây. Vui lòng kiểm tra lại!"); dispatch({ type: "loadFailed", error: "cloud-load-failed" }); } }, [input.userId, input.onError]);
  const startCloudMutation = useCallback(() => dispatch({ type: "loadStarted", source: "cloud" }), []);
  const failCloudMutation = useCallback(() => dispatch({ type: "loadFailed", error: "cloud-mutation-failed" }), []);
  useEffect(() => { if (state.source === "local") loadLocal(); else if (input.userId) void refreshCloud(); }, [input.userId, input.refreshVersion, state.source, loadLocal, refreshCloud]);
  const setSource = useCallback((source: LibrarySource) => dispatch({ type: "loadStarted", source }), []);
  const setQuery = useCallback((query: string) => dispatch({ type: "queryChanged", query }), []);
  const setViewMode = useCallback((viewMode: "gallery" | "list") => { localRepository.writeViewMode(viewMode); dispatch({ type: "viewModeChanged", viewMode }); }, [localRepository]);
  const selectFolder = useCallback((folderId: string | null) => dispatch({ type: "folderSelected", folderId }), []);
  const mutateLocal = useCallback((mutator: (snapshot: LocalLibrarySnapshot) => LocalLibrarySnapshot) => { const next = mutator(localRawRef.current); localRawRef.current = next; localRepository.save(next); dispatch({ type: "snapshotLoaded", source: "local", ...projectLocalLibrary(next.folders, next.uncategorized) }); }, [localRepository]);
  const clearLocalAfterMigration = useCallback(() => { localRepository.clear(); localRepository.markCloudMigrated(); localRawRef.current = { folders: [], uncategorized: [] }; }, [localRepository]);
  const filtered = selectFilteredLibrary(state);
  return { ...state, folders: filtered.folders, uncategorized: filtered.uncategorized, allFolders: state.folders, allUncategorized: state.uncategorized, setSource, setQuery, setViewMode, selectFolder, mutateLocal, refreshCloud, startCloudMutation, failCloudMutation, clearLocalAfterMigration };
}
