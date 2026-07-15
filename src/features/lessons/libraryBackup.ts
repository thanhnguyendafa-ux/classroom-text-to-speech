import { hydrateLessonDocument } from '../../domain/lessonModel';
import type { LocalLibrarySnapshot, SavedFolder } from './localLibraryRepository';

const APP_ID = 'classroom-speech-pro-backup';
const VERSION = 1;

export function serializeLibraryBackup(snapshot: LocalLibrarySnapshot, exportedAt = Date.now()): string {
  return JSON.stringify({ appId: APP_ID, version: VERSION, exportedAt, folders: snapshot.folders, uncategorized: snapshot.uncategorized }, null, 2);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function parseLibraryBackup(text: string, createId: () => string, now = Date.now()): LocalLibrarySnapshot {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('Invalid backup JSON'); }
  const record = asRecord(parsed);
  if (record.version !== VERSION || (record.appId !== undefined && record.appId !== APP_ID)) throw new Error('Unsupported backup version');
  const folders = Array.isArray(record.folders) ? record.folders : [];
  const uncategorized = Array.isArray(record.uncategorized) ? record.uncategorized : [];
  return {
    folders: folders.flatMap((value): SavedFolder[] => {
      const folder = asRecord(value);
      const name = typeof folder.name === 'string' && folder.name.trim() ? folder.name.trim() : 'Imported folder';
      const lessons = Array.isArray(folder.lessons) ? folder.lessons.map((lesson) => ({ ...hydrateLessonDocument(createId(), asRecord(lesson)), folderId: typeof folder.id === 'string' ? folder.id : null })) : [];
      return [{ id: typeof folder.id === 'string' ? folder.id : createId(), name, createdAt: typeof folder.createdAt === 'number' ? folder.createdAt : now, lessons }];
    }),
    uncategorized: uncategorized.map((lesson) => ({ ...hydrateLessonDocument(createId(), asRecord(lesson)), folderId: null })),
  };
}

export function mergeLibraryBackup(current: LocalLibrarySnapshot, incoming: LocalLibrarySnapshot): LocalLibrarySnapshot {
  const folders = current.folders.map((folder) => ({ ...folder, lessons: [...folder.lessons] }));
  for (const incomingFolder of incoming.folders) {
    const existing = folders.find((folder) => folder.name.toLowerCase() === incomingFolder.name.toLowerCase());
    if (existing) {
      for (const lesson of incomingFolder.lessons) {
        if (!existing.lessons.some((item) => item.title.toLowerCase() === lesson.title.toLowerCase())) existing.lessons.push({ ...lesson, folderId: existing.id });
      }
    } else {
      folders.push({ ...incomingFolder, lessons: incomingFolder.lessons.map((lesson) => ({ ...lesson, folderId: incomingFolder.id })) });
    }
  }
  const uncategorized = [...current.uncategorized];
  for (const lesson of incoming.uncategorized) {
    if (!uncategorized.some((item) => item.title.toLowerCase() === lesson.title.toLowerCase())) uncategorized.push({ ...lesson, folderId: null });
  }
  return { folders, uncategorized };
}
