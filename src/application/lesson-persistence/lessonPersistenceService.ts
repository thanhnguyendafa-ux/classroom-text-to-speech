import type { LessonDraft } from "../../types";

export type LessonPersistenceRepository = {
  create(userId: string, lessonId: string, draft: LessonDraft): Promise<number>;
  update(userId: string, lessonId: string, draft: LessonDraft, expectedRevision: number): Promise<number>;
};

export type PersistLessonResult = { lessonId: string; revision: number; created: boolean };

type PersistLessonInput = {
  userId: string;
  draft: LessonDraft;
  lessonId: string | null;
  revision: number;
  createId: () => string;
  repository: LessonPersistenceRepository;
};

export async function persistLesson(input: PersistLessonInput): Promise<PersistLessonResult> {
  if (input.lessonId) {
    const revision = await input.repository.update(input.userId, input.lessonId, input.draft, input.revision);
    return { lessonId: input.lessonId, revision, created: false };
  }
  const lessonId = input.createId();
  const revision = await input.repository.create(input.userId, lessonId, { ...input.draft, folderId: null });
  return { lessonId, revision, created: true };
}

export async function persistLessonCopy(input: Omit<PersistLessonInput, "lessonId" | "revision">): Promise<PersistLessonResult> {
  const lessonId = input.createId();
  const revision = await input.repository.create(input.userId, lessonId, { ...input.draft, folderId: null });
  return { lessonId, revision, created: true };
}
