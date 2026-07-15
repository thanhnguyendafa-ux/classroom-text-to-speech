import type { LessonDraft } from '../../types';
import type { CloudFolder, CloudLesson } from '../cloud-lessons/cloudLessonApi';

type CloudLibraryApi = {
  listFolders(uid: string): Promise<CloudFolder[]>;
  listLessons(uid: string): Promise<CloudLesson[]>;
  createFolder(uid: string, folderId: string, name: string): Promise<void>;
  updateFolder(uid: string, folderId: string, name: string): Promise<void>;
  deleteFolder(uid: string, folderId: string): Promise<void>;
  createLesson(uid: string, lessonId: string, lesson: LessonDraft): Promise<number>;
  updateLesson(uid: string, lessonId: string, patch: Partial<LessonDraft>, expectedRevision?: number): Promise<number>;
  deleteLesson(uid: string, lessonId: string): Promise<void>;
};

export function createCloudLibraryService(api: CloudLibraryApi) {
  return {
    async load(uid: string) {
      const [folders, lessons] = await Promise.all([api.listFolders(uid), api.listLessons(uid)]);
      return { folders, lessons };
    },
    createFolder: api.createFolder,
    renameFolder: api.updateFolder,
    createLesson: api.createLesson,
    renameLesson(uid: string, lessonId: string, title: string) {
      return api.updateLesson(uid, lessonId, { title });
    },
    deleteLesson: api.deleteLesson,
    async deleteFolder(uid: string, folderId: string, keepLessons: boolean, lessons: CloudLesson[]) {
      const ownedLessons = lessons.filter((lesson) => lesson.folderId === folderId);
      for (const lesson of ownedLessons) {
        if (keepLessons) await api.updateLesson(uid, lesson.id, { folderId: null });
        else await api.deleteLesson(uid, lesson.id);
      }
      await api.deleteFolder(uid, folderId);
    },
  };
}
