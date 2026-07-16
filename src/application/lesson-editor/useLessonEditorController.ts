import { useCallback, useReducer, type Dispatch, type SetStateAction } from "react";
import type { SpeechItem } from "../../types";
import { createLessonEditorState, lessonEditorReducer } from "../../domain/lesson/lessonEditorReducer";
import type { LessonEditorState } from "../../domain/lesson/lessonEditorTypes";

export function useLessonEditorController(initial: Pick<LessonEditorState, "title" | "rawText"> & Partial<Pick<LessonEditorState, "speechList">>) {
  const [state, dispatch] = useReducer(lessonEditorReducer, initial, createLessonEditorState);
  const setTitle: Dispatch<SetStateAction<string>> = useCallback((update) => dispatch({ type: "titleChanged", update }), []);
  const setRawText: Dispatch<SetStateAction<string>> = useCallback((update) => dispatch({ type: "rawTextChanged", update }), []);
  const setSpeechList: Dispatch<SetStateAction<SpeechItem[]>> = useCallback((update) => dispatch({ type: "speechListChanged", update }), []);
  const setEditingItemId: Dispatch<SetStateAction<string | null>> = useCallback((update) => dispatch({ type: "editingItemChanged", update }), []);
  const setEditingText: Dispatch<SetStateAction<string>> = useCallback((update) => dispatch({ type: "editingTextChanged", update }), []);
  const loadLesson = useCallback((lesson: { title: string; rawText: string; speechList: SpeechItem[] }) => dispatch({ type: "lessonLoaded", ...lesson }), []);
  const resetEditor = useCallback((title: string) => dispatch({ type: "editorReset", title }), []);
  return { ...state, setTitle, setRawText, setSpeechList, setEditingItemId, setEditingText, loadLesson, resetEditor };
}
