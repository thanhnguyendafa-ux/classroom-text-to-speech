import assert from "node:assert/strict";
import test from "node:test";
import type { LessonDraft } from "../../types";
import { persistLesson, persistLessonCopy } from "./lessonPersistenceService";

const draft = { title: "Lesson", rawText: "Hello", folderId: null, speechList: [], settings: { speed: 1, timeBetweenLines: 2, rowLayoutMode: "below", engineMode: "browser", selectedPremiumVoiceEn: "", selectedPremiumVoiceVi: "", selectedPremiumVoiceZhCn: "", selectedPremiumVoiceZhTw: "", selectedPremiumVoiceJa: "", selectedPremiumVoiceKo: "", selectedEnVoiceName: "", selectedViVoiceName: "", selectedZhCnVoiceName: "", selectedZhTwVoiceName: "", selectedJaVoiceName: "", selectedKoVoiceName: "", autoGroupSet: false, setMultiplier: 1, useUniversalImage: false, universalImageUrl: "" } } satisfies LessonDraft;

test("creates a new lesson with revision one", async () => {
  const calls: string[] = [];
  const result = await persistLesson({ userId: "u1", draft, lessonId: null, revision: 1, createId: () => "lesson-new", repository: { create: async (_uid, id) => { calls.push(id); return 1; }, update: async () => 99 } });
  assert.deepEqual(result, { lessonId: "lesson-new", revision: 1, created: true });
  assert.deepEqual(calls, ["lesson-new"]);
});

test("updates an existing lesson using the expected revision", async () => {
  let expectedRevision = 0;
  const result = await persistLesson({ userId: "u1", draft, lessonId: "lesson-1", revision: 4, createId: () => "unused", repository: { create: async () => 1, update: async (_uid, _id, _draft, expected) => { expectedRevision = expected; return 5; } } });
  assert.deepEqual(result, { lessonId: "lesson-1", revision: 5, created: false });
  assert.equal(expectedRevision, 4);
});

test("copy always creates a new identity without mutating the source", async () => {
  const result = await persistLessonCopy({ userId: "u1", draft, createId: () => "lesson-copy", repository: { create: async () => 1, update: async () => 2 } });
  assert.deepEqual(result, { lessonId: "lesson-copy", revision: 1, created: true });
  assert.equal(draft.title, "Lesson");
});
