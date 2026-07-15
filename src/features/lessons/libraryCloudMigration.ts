import type { LessonDraft } from '../../types';
import type { LocalLibrarySnapshot, SavedLesson } from './localLibraryRepository';

type CloudMigrationOperations = {
  createFolder: (uid: string, folderId: string, name: string) => Promise<void>;
  createLesson: (uid: string, lessonId: string, lesson: LessonDraft) => Promise<number>;
};

function toDraft(lesson: SavedLesson, folderId: string | null): LessonDraft {
  return {
    title: lesson.title,
    rawText: lesson.rawText,
    speechList: lesson.speechList ?? [],
    settings: lesson.settings,
    folderId,
  };
}

export async function migrateLocalLibraryToCloud(uid: string, snapshot: LocalLibrarySnapshot, operations: CloudMigrationOperations): Promise<void> {
  for (const folder of snapshot.folders) {
    await operations.createFolder(uid, folder.id, folder.name);
    for (const lesson of folder.lessons) {
      await operations.createLesson(uid, lesson.id, toDraft(lesson, folder.id));
    }
  }
  for (const lesson of snapshot.uncategorized) {
    await operations.createLesson(uid, lesson.id, toDraft(lesson, null));
  }
}
