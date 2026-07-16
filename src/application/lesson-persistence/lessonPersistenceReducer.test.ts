import assert from "node:assert/strict";
import test from "node:test";
import { createLessonPersistenceState, lessonPersistenceReducer, selectLessonPersistenceStatus } from "./lessonPersistenceReducer";

test("save success updates identity revision and fingerprint atomically", () => {
  const saving = lessonPersistenceReducer(createLessonPersistenceState(), { type: "saveStarted" });
  const saved = lessonPersistenceReducer(saving, { type: "saveSucceeded", lessonId: "lesson-1", revision: 2, fingerprint: "fp-2" });
  assert.deepEqual(saved, { lessonId: "lesson-1", revision: 2, savedFingerprint: "fp-2", operation: "idle", error: null, conflict: null });
  assert.equal(selectLessonPersistenceStatus(saved, "fp-2"), "saved");
});

test("save failure retains persisted identity and exposes recoverable error", () => {
  const initial = createLessonPersistenceState({ lessonId: "lesson-1", revision: 3, savedFingerprint: "fp-old" });
  const failed = lessonPersistenceReducer(lessonPersistenceReducer(initial, { type: "saveStarted" }), { type: "saveFailed", error: "offline" });
  assert.equal(failed.lessonId, "lesson-1");
  assert.equal(failed.revision, 3);
  assert.equal(failed.savedFingerprint, "fp-old");
  assert.equal(selectLessonPersistenceStatus(failed, "fp-new"), "error");
});

test("conflict preserves local fingerprint and records remote revision", () => {
  const initial = createLessonPersistenceState({ lessonId: "lesson-1", revision: 2, savedFingerprint: "fp-old" });
  const conflicted = lessonPersistenceReducer(initial, { type: "saveConflicted", expectedRevision: 2, currentRevision: 4 });
  assert.deepEqual(conflicted.conflict, { expectedRevision: 2, currentRevision: 4 });
  assert.equal(conflicted.savedFingerprint, "fp-old");
  assert.equal(selectLessonPersistenceStatus(conflicted, "fp-local"), "conflict");
});

test("loading and resetting replace the entire persistence session", () => {
  const loaded = lessonPersistenceReducer(createLessonPersistenceState(), { type: "lessonLoaded", lessonId: "lesson-2", revision: 5, fingerprint: "fp" });
  assert.equal(selectLessonPersistenceStatus(loaded, "fp"), "saved");
  assert.deepEqual(lessonPersistenceReducer(loaded, { type: "sessionReset" }), createLessonPersistenceState());
});

test("new lesson becomes dirty after its initialized baseline changes", () => {
  const baseline = lessonPersistenceReducer(createLessonPersistenceState(), { type: "baselineInitialized", fingerprint: "fp-empty" });
  assert.equal(selectLessonPersistenceStatus(baseline, "fp-empty"), "new");
  assert.equal(selectLessonPersistenceStatus(baseline, "fp-edited"), "dirty");
});
