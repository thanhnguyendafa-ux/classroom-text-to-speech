import type { LessonDocument } from '../../types';

export type SavedLesson = Omit<LessonDocument, 'folderId' | 'updatedAt'> & {
  folderId?: string | null;
  updatedAt?: number;
};

export interface SavedFolder {
  id: string;
  name: string;
  lessons: SavedLesson[];
  createdAt: number;
}

export interface LocalLibrarySnapshot {
  folders: SavedFolder[];
  uncategorized: SavedLesson[];
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function readArray<T>(storage: StorageLike, key: string): T[] {
  const raw = storage.getItem(key);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

export function createLocalLibraryRepository(storage: StorageLike, uid: string) {
  const foldersKey = `library_folders_${uid}`;
  const uncategorizedKey = `library_uncategorized_${uid}`;
  const seedKey = `library_seed_version_v3_${uid}`;

  const load = (): LocalLibrarySnapshot => ({
    folders: readArray<SavedFolder>(storage, foldersKey),
    uncategorized: readArray<SavedLesson>(storage, uncategorizedKey),
  });

  const save = (snapshot: LocalLibrarySnapshot) => {
    storage.setItem(foldersKey, JSON.stringify(snapshot.folders));
    storage.setItem(uncategorizedKey, JSON.stringify(snapshot.uncategorized));
    storage.setItem(seedKey, 'true');
  };

  return {
    load,
    save,
    readViewMode: (): 'gallery' | 'list' => storage.getItem('lessonLibraryViewMode') === 'list' ? 'list' : 'gallery',
    writeViewMode: (mode: 'gallery' | 'list') => storage.setItem('lessonLibraryViewMode', mode),
    markCloudMigrated: () => storage.setItem(`library_migrated_${uid}`, 'true'),
    isSeeded: () => storage.getItem(seedKey) === 'true',
    loadWithLegacyMigration() {
      const scoped = load();
      if (scoped.folders.length > 0 || scoped.uncategorized.length > 0 || storage.getItem(seedKey) === 'true' || uid === 'global') {
        return { snapshot: scoped, migrated: false };
      }
      const legacyFolders = storage.getItem('library_folders');
      const legacyUncategorized = storage.getItem('library_uncategorized');
      if (!legacyFolders && !legacyUncategorized) return { snapshot: scoped, migrated: false };
      if (legacyFolders) storage.setItem(foldersKey, legacyFolders);
      if (legacyUncategorized) storage.setItem(uncategorizedKey, legacyUncategorized);
      storage.setItem(seedKey, storage.getItem('library_seed_version_v3') || 'true');
      return { snapshot: load(), migrated: true };
    },
    clear() {
      storage.removeItem(foldersKey);
      storage.removeItem(uncategorizedKey);
      storage.removeItem(seedKey);
    },
  };
}

export function createBrowserLocalLibraryRepository(uid: string) {
  const storage: StorageLike = typeof window === 'undefined'
    ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
    : window.localStorage;
  return createLocalLibraryRepository(storage, uid);
}
