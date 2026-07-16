import type { LessonEditorAction, LessonEditorState, ValueUpdater } from "./lessonEditorTypes";

function applyUpdate<T>(current: T, update: ValueUpdater<T>): T {
  return typeof update === "function" ? (update as (value: T) => T)(current) : update;
}

export function createLessonEditorState(initial: Partial<LessonEditorState> = {}): LessonEditorState {
  return {
    title: initial.title ?? "",
    rawText: initial.rawText ?? "",
    speechList: initial.speechList ?? [],
    editingItemId: initial.editingItemId ?? null,
    editingText: initial.editingText ?? "",
  };
}

export function lessonEditorReducer(state: LessonEditorState, action: LessonEditorAction): LessonEditorState {
  switch (action.type) {
    case "titleChanged": return { ...state, title: applyUpdate(state.title, action.update) };
    case "rawTextChanged": return { ...state, rawText: applyUpdate(state.rawText, action.update) };
    case "speechListChanged": return { ...state, speechList: applyUpdate(state.speechList, action.update) };
    case "editingItemChanged": return { ...state, editingItemId: applyUpdate(state.editingItemId, action.update) };
    case "editingTextChanged": return { ...state, editingText: applyUpdate(state.editingText, action.update) };
    case "editingChanged": return { ...state, editingItemId: action.itemId, editingText: action.text };
    case "lessonLoaded": return createLessonEditorState({ title: action.title, rawText: action.rawText, speechList: action.speechList });
    case "editorReset": return createLessonEditorState({ title: action.title });
  }
}
