import assert from "node:assert/strict";
import test from "node:test";
import { createLessonEditorState, lessonEditorReducer } from "./lessonEditorReducer";
import type { SpeechItem } from "../../types";

const item: SpeechItem = { id: "line-1", text: "Hello", detectedLang: "en", selectedLang: "auto", resolvedLang: "en", repeats: 1, delaySec: 2, speed: 1 };

test("loads a lesson draft atomically", () => {
  const state = lessonEditorReducer(createLessonEditorState(), { type: "lessonLoaded", title: "Loaded", rawText: "Hello", speechList: [item] });
  assert.equal(state.title, "Loaded");
  assert.equal(state.rawText, "Hello");
  assert.deepEqual(state.speechList, [item]);
  assert.equal(state.editingItemId, null);
});

test("applies direct and functional field updates against current reducer state", () => {
  const initial = createLessonEditorState({ rawText: "one", speechList: [item] });
  const textChanged = lessonEditorReducer(initial, { type: "rawTextChanged", update: (current) => current + " two" });
  const rowsChanged = lessonEditorReducer(textChanged, { type: "speechListChanged", update: (current) => [...current, { ...item, id: "line-2" }] });
  assert.equal(rowsChanged.rawText, "one two");
  assert.equal(rowsChanged.speechList.length, 2);
});

test("resets the complete editor session without retaining editing state", () => {
  const editing = lessonEditorReducer(createLessonEditorState({ title: "Old", rawText: "Old", speechList: [item] }), { type: "editingChanged", itemId: "line-1", text: "Draft" });
  const reset = lessonEditorReducer(editing, { type: "editorReset", title: "Bài học mới" });
  assert.deepEqual(reset, createLessonEditorState({ title: "Bài học mới" }));
});
