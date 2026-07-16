import assert from "node:assert/strict";
import test from "node:test";
import { createLessonFingerprint } from "../features/lesson-editor/lessonEditorStatus";
import { resolveLessonSaveStatus } from "../features/lesson-editor/lessonSaveStatus";
import { initialPlaybackState, playbackReducer } from "../features/playback/playbackState";

test("lesson save lifecycle preserves dirty content through failure and clears after success", () => {
  const saved = createLessonFingerprint({ title: "Lesson", rawText: "old" });
  const edited = createLessonFingerprint({ title: "Lesson", rawText: "new" });
  assert.notEqual(saved, edited);
  assert.equal(resolveLessonSaveStatus({ isSaving: false, hasError: false, isDirty: true, hasSavedLesson: true }), "dirty");
  assert.equal(resolveLessonSaveStatus({ isSaving: true, hasError: false, isDirty: true, hasSavedLesson: true }), "saving");
  assert.equal(resolveLessonSaveStatus({ isSaving: false, hasError: true, isDirty: true, hasSavedLesson: true }), "error");
  assert.equal(resolveLessonSaveStatus({ isSaving: false, hasError: false, isDirty: false, hasSavedLesson: true }), "saved");
});

test("playback lifecycle has one active item and stop releases all transient state", () => {
  const started = playbackReducer(initialPlaybackState, { type: "started", itemId: "line-1" });
  const paused = playbackReducer(started, { type: "paused" });
  const resumed = playbackReducer(paused, { type: "resumed" });
  assert.equal(resumed.playingItemId, "line-1");
  assert.equal(resumed.playingState, "playing");
  assert.deepEqual(playbackReducer(resumed, { type: "stopped" }), initialPlaybackState);
});
