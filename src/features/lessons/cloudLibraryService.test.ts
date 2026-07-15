import assert from 'node:assert/strict';
import test from 'node:test';
import { createCloudLibraryService } from './cloudLibraryService';

const lessons = [{ id: 'l1', folderId: 'f1' }, { id: 'l2', folderId: 'f2' }] as never[];

function harness() {
  const calls: string[] = [];
  const service = createCloudLibraryService({
    listFolders: async () => [{ id: 'f1' }] as never[],
    listLessons: async () => lessons,
    createFolder: async () => undefined,
    updateFolder: async () => undefined,
    deleteFolder: async (_uid, id) => { calls.push('folder:' + id); },
    createLesson: async () => 1,
    updateLesson: async (_uid, id, patch) => { calls.push('update:' + id + ':' + String(patch.folderId)); return 1; },
    deleteLesson: async (_uid, id) => { calls.push('delete:' + id); },
  });
  return { service, calls };
}

test('loads folders and lessons in parallel into one snapshot', async () => {
  const { service } = harness();
  const snapshot = await service.load('u1');
  assert.equal(snapshot.folders.length, 1);
  assert.equal(snapshot.lessons.length, 2);
});

test('detaches lessons before deleting a folder when keepLessons is true', async () => {
  const { service, calls } = harness();
  await service.deleteFolder('u1', 'f1', true, lessons);
  assert.deepEqual(calls, ['update:l1:null', 'folder:f1']);
});

test('deletes owned lessons before deleting a folder when keepLessons is false', async () => {
  const { service, calls } = harness();
  await service.deleteFolder('u1', 'f1', false, lessons);
  assert.deepEqual(calls, ['delete:l1', 'folder:f1']);
});
