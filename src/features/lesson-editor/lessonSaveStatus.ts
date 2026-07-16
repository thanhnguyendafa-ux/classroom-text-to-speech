export type LessonSaveStatus = 'new' | 'dirty' | 'saving' | 'saved' | 'error';

export function resolveLessonSaveStatus(input: { isSaving: boolean; hasError: boolean; isDirty: boolean; hasSavedLesson: boolean }): LessonSaveStatus {
  if (input.isSaving) return 'saving';
  if (input.hasError) return 'error';
  if (input.isDirty) return 'dirty';
  return input.hasSavedLesson ? 'saved' : 'new';
}
