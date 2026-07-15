import assert from 'node:assert/strict';
import test from 'node:test';
import { createLessonFingerprint } from './lessonEditorStatus';

const lesson = { title: 'Lesson', rawText: 'hello', speechList: [{ id: '1', text: 'hello' }], settings: { speed: 1 } };

test('same lesson content has the same fingerprint', () => {
  assert.equal(createLessonFingerprint(lesson), createLessonFingerprint({ ...lesson }));
});

test('user-visible lesson changes produce a different fingerprint', () => {
  const baseline = createLessonFingerprint(lesson);
  assert.notEqual(createLessonFingerprint({ ...lesson, title: 'Changed' }), baseline);
  assert.notEqual(createLessonFingerprint({ ...lesson, rawText: 'changed' }), baseline);
  assert.notEqual(createLessonFingerprint({ ...lesson, settings: { speed: 2 } }), baseline);
});
