import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeLibraryBackup, parseLibraryBackup, serializeLibraryBackup } from './libraryBackup';

test('serializes a versioned backup contract', () => {
  const text = serializeLibraryBackup({ folders: [], uncategorized: [] }, 123);
  assert.deepEqual(JSON.parse(text), { appId: 'classroom-speech-pro-backup', version: 1, exportedAt: 123, folders: [], uncategorized: [] });
});

test('rejects malformed JSON and unsupported backup versions', () => {
  assert.throws(() => parseLibraryBackup('{broken', () => 'id', 1));
  assert.throws(() => parseLibraryBackup(JSON.stringify({ appId: 'classroom-speech-pro-backup', version: 9, folders: [] }), () => 'id', 1));
});

test('normalizes unknown lesson data before returning a snapshot', () => {
  let id = 0;
  const snapshot = parseLibraryBackup(JSON.stringify({ version: 1, folders: [{ name: ' Imported ', lessons: [{ title: ' Lesson ', speechList: [{ text: 'Hi', repeats: 99 }] }] }], uncategorized: [{ title: 'Loose' }] }), () => `id-${id++}`, 100);
  assert.equal(snapshot.folders[0].name, 'Imported');
  assert.equal(snapshot.folders[0].lessons[0].speechList[0].repeats, 10);
  assert.equal(snapshot.uncategorized[0].folderId, null);
});

test('merges by case-insensitive names without mutating current snapshot', () => {
  const current = { folders: [{ id: 'f1', name: 'Course', createdAt: 1, lessons: [] }], uncategorized: [] };
  const incoming = parseLibraryBackup(JSON.stringify({ version: 1, folders: [{ id: 'f2', name: 'course', createdAt: 2, lessons: [{ id: 'l1', title: 'New', rawText: '', speechList: [], settings: {}, createdAt: 2 }] }], uncategorized: [] }), () => 'generated', 2);
  const merged = mergeLibraryBackup(current, incoming);
  assert.equal(merged.folders.length, 1);
  assert.equal(merged.folders[0].lessons.length, 1);
  assert.equal(current.folders[0].lessons.length, 0);
});
