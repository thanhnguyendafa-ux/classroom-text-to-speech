export class LessonConflictError extends Error {
  constructor(currentRevision: number, expectedRevision: number) {
    super(`Lesson revision conflict: expected ${expectedRevision}, current ${currentRevision}.`);
    this.name = 'LessonConflictError';
  }
}

export function assertExpectedRevision(currentRevision: number, expectedRevision?: number): void {
  if (expectedRevision !== undefined && currentRevision !== expectedRevision) {
    throw new LessonConflictError(currentRevision, expectedRevision);
  }
}

export function nextRevision(currentRevision: number): number {
  return Math.max(1, Math.floor(currentRevision)) + 1;
}
