import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveLessonSaveStatus } from './lessonSaveStatus';

test('prioritizes saving and failure over dirty/saved state', () => {
  assert.equal(resolveLessonSaveStatus({ isSaving: true, hasError: true, isDirty: true, hasSavedLesson: true }), 'saving');
  assert.equal(resolveLessonSaveStatus({ isSaving: false, hasError: true, isDirty: true, hasSavedLesson: true }), 'error');
});

test('distinguishes dirty, saved, and new lessons', () => {
  assert.equal(resolveLessonSaveStatus({ isSaving: false, hasError: false, isDirty: true, hasSavedLesson: true }), 'dirty');
  assert.equal(resolveLessonSaveStatus({ isSaving: false, hasError: false, isDirty: false, hasSavedLesson: true }), 'saved');
  assert.equal(resolveLessonSaveStatus({ isSaving: false, hasError: false, isDirty: false, hasSavedLesson: false }), 'new');
});

test('distinguishes a remote conflict from a generic save error', () => {
  assert.equal(resolveLessonSaveStatus({ isSaving: false, hasError: true, isDirty: true, hasSavedLesson: true }), 'error');
});
