import assert from 'node:assert/strict';
import test from 'node:test';
import { assertExpectedRevision, nextRevision } from './lessonRevision';

test('accepts an update when expected revision matches current revision', () => {
  assert.doesNotThrow(() => assertExpectedRevision(3, 3));
  assert.equal(nextRevision(3), 4);
});

test('rejects stale updates with a conflict error', () => {
  assert.throws(() => assertExpectedRevision(4, 3), error => error instanceof Error && error.name === 'LessonConflictError');
});
