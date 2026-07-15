import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalLibraryRepository } from './localLibraryRepository';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

test('scopes library records by user and round-trips one snapshot', () => {
  const store = storage();
  const repository = createLocalLibraryRepository(store, 'user-1');
  const snapshot = { folders: [{ id: 'f1', name: 'Folder', lessons: [], createdAt: 1 }], uncategorized: [] };

  repository.save(snapshot);
  assert.deepEqual(repository.load(), snapshot);
  assert.equal(store.getItem('library_folders_user-1'), JSON.stringify(snapshot.folders));
});

test('migrates legacy global records exactly once into user scope', () => {
  const store = storage();
  store.setItem('library_folders', JSON.stringify([{ id: 'legacy', name: 'Legacy', lessons: [], createdAt: 1 }]));
  store.setItem('library_seed_version_v3', 'true');
  const repository = createLocalLibraryRepository(store, 'user-1');

  const result = repository.loadWithLegacyMigration();
  assert.equal(result.migrated, true);
  assert.equal(result.snapshot.folders[0].id, 'legacy');
  assert.equal(store.getItem('library_folders_user-1'), store.getItem('library_folders'));
});

test('clear removes only the selected user library', () => {
  const store = storage();
  const repository = createLocalLibraryRepository(store, 'user-1');
  repository.save({ folders: [], uncategorized: [] });
  repository.clear();
  assert.equal(store.getItem('library_folders_user-1'), null);
});

test('stores presentation preference and cloud migration marker through the repository', () => {
  const store = storage();
  const repository = createLocalLibraryRepository(store, 'user-1');
  repository.writeViewMode('list');
  repository.markCloudMigrated();
  assert.equal(repository.readViewMode(), 'list');
  assert.equal(store.getItem('library_migrated_user-1'), 'true');
});
