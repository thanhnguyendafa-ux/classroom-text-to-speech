import assert from 'node:assert/strict';
import test from 'node:test';
import { migrateLocalLibraryToCloud } from './libraryCloudMigration';

const settings = { speed: 1, timeBetweenLines: 2, rowLayoutMode: 'below' as const, engineMode: 'browser' as const, selectedPremiumVoiceEn: '', selectedPremiumVoiceVi: '', selectedPremiumVoiceZhCn: '', selectedPremiumVoiceZhTw: '', selectedPremiumVoiceJa: '', selectedPremiumVoiceKo: '', selectedEnVoiceName: '', selectedViVoiceName: '', selectedZhCnVoiceName: '', selectedZhTwVoiceName: '', selectedJaVoiceName: '', selectedKoVoiceName: '', autoGroupSet: false, setMultiplier: 1, useUniversalImage: false, universalImageUrl: '' };
const lesson = { id: 'l1', schemaVersion: 1 as const, revision: 1, title: 'Lesson', rawText: 'Text', speechList: [], settings, createdAt: 1 };

test('migrates folders before lessons and preserves canonical folder ownership', async () => {
  const calls: string[] = [];
  await migrateLocalLibraryToCloud('u1', { folders: [{ id: 'f1', name: 'Folder', createdAt: 1, lessons: [lesson] }], uncategorized: [{ ...lesson, id: 'l2' }] }, {
    createFolder: async (_uid, id) => { calls.push('folder:' + id); },
    createLesson: async (_uid, id, draft) => { calls.push('lesson:' + id + ':' + (draft.folderId ?? 'none')); return 1; },
  });
  assert.deepEqual(calls, ['folder:f1', 'lesson:l1:f1', 'lesson:l2:none']);
});

test('does not start lesson writes when folder creation fails', async () => {
  let lessonWrites = 0;
  await assert.rejects(() => migrateLocalLibraryToCloud('u1', { folders: [{ id: 'f1', name: 'Folder', createdAt: 1, lessons: [lesson] }], uncategorized: [] }, {
    createFolder: async () => { throw new Error('folder failed'); },
    createLesson: async () => { lessonWrites += 1; return 1; },
  }));
  assert.equal(lessonWrites, 0);
});
