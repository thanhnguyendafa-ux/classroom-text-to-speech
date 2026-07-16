import type { CloudFolder, CloudLesson } from "../../features/cloud-lessons/cloudLessonApi";
import type { SavedFolder, SavedLesson } from "../../features/lessons/localLibraryRepository";
import type { LibraryDisplayFolder, LibraryDisplayLesson } from "../../features/lessons/libraryDisplayModel";

export type LibraryDisplaySnapshot = { folders: LibraryDisplayFolder[]; uncategorized: LibraryDisplayLesson[] };
const copyLesson = (lesson: SavedLesson | CloudLesson): LibraryDisplayLesson => ({ id: lesson.id, schemaVersion: lesson.schemaVersion, revision: lesson.revision, title: lesson.title, rawText: lesson.rawText, speechList: lesson.speechList, settings: lesson.settings, createdAt: lesson.createdAt, updatedAt: lesson.updatedAt, folderId: lesson.folderId ?? null });
export function projectCloudLibrary(folders: CloudFolder[], lessons: CloudLesson[]): LibraryDisplaySnapshot { return { folders: folders.map((folder) => ({ id: folder.id, name: folder.name, createdAt: folder.createdAt, lessons: lessons.filter((lesson) => lesson.folderId === folder.id).map(copyLesson) })), uncategorized: lessons.filter((lesson) => lesson.folderId === null).map(copyLesson) }; }
export function projectLocalLibrary(folders: SavedFolder[], uncategorized: SavedLesson[]): LibraryDisplaySnapshot { return { folders: folders.map((folder) => ({ id: folder.id, name: folder.name, createdAt: folder.createdAt, lessons: folder.lessons.map(copyLesson) })), uncategorized: uncategorized.map(copyLesson) }; }
