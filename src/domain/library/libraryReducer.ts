import type { LibraryDisplayFolder, LibraryDisplayLesson, LibrarySource } from "../../features/lessons/libraryDisplayModel";

export type LibraryState = { source: LibrarySource; folders: LibraryDisplayFolder[]; uncategorized: LibraryDisplayLesson[]; selectedFolderId: string | null; query: string; viewMode: "gallery" | "list"; loadStatus: "idle" | "loading" | "ready" | "error"; error: string | null };
export type LibraryAction =
  | { type: "loadStarted"; source: LibrarySource }
  | { type: "snapshotLoaded"; source: LibrarySource; folders: LibraryDisplayFolder[]; uncategorized: LibraryDisplayLesson[] }
  | { type: "loadFailed"; error: string }
  | { type: "folderSelected"; folderId: string | null }
  | { type: "queryChanged"; query: string }
  | { type: "viewModeChanged"; viewMode: "gallery" | "list" };

export function createLibraryState(initial: Partial<LibraryState> = {}): LibraryState { return { source: initial.source ?? "cloud", folders: initial.folders ?? [], uncategorized: initial.uncategorized ?? [], selectedFolderId: initial.selectedFolderId ?? null, query: initial.query ?? "", viewMode: initial.viewMode ?? "gallery", loadStatus: initial.loadStatus ?? "idle", error: initial.error ?? null }; }
export function libraryReducer(state: LibraryState, action: LibraryAction): LibraryState { switch (action.type) { case "loadStarted": return { ...state, source: action.source, selectedFolderId: null, loadStatus: "loading", error: null }; case "snapshotLoaded": return { ...state, source: action.source, folders: action.folders, uncategorized: action.uncategorized, selectedFolderId: null, loadStatus: "ready", error: null }; case "loadFailed": return { ...state, loadStatus: "error", error: action.error }; case "folderSelected": return { ...state, selectedFolderId: action.folderId }; case "queryChanged": return { ...state, query: action.query }; case "viewModeChanged": return { ...state, viewMode: action.viewMode }; } }
export function selectFilteredLibrary(state: LibraryState): { folders: LibraryDisplayFolder[]; uncategorized: LibraryDisplayLesson[] } { const query = state.query.trim().toLowerCase(); if (!query) return { folders: state.folders, uncategorized: state.uncategorized }; const folders = state.folders.map((folder) => ({ ...folder, lessons: folder.lessons.filter((lesson) => lesson.title.toLowerCase().includes(query)) })).filter((folder) => folder.name.toLowerCase().includes(query) || folder.lessons.length > 0); return { folders, uncategorized: state.uncategorized.filter((lesson) => lesson.title.toLowerCase().includes(query)) }; }
