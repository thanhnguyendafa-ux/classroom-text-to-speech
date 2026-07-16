import type { SpeechItem } from "../../types";

export type ValueUpdater<T> = T | ((current: T) => T);

export type LessonEditorState = {
  title: string;
  rawText: string;
  speechList: SpeechItem[];
  editingItemId: string | null;
  editingText: string;
};

export type LessonEditorAction =
  | { type: "titleChanged"; update: ValueUpdater<string> }
  | { type: "rawTextChanged"; update: ValueUpdater<string> }
  | { type: "speechListChanged"; update: ValueUpdater<SpeechItem[]> }
  | { type: "editingItemChanged"; update: ValueUpdater<string | null> }
  | { type: "editingTextChanged"; update: ValueUpdater<string> }
  | { type: "editingChanged"; itemId: string | null; text: string }
  | { type: "lessonLoaded"; title: string; rawText: string; speechList: SpeechItem[] }
  | { type: "editorReset"; title: string };
