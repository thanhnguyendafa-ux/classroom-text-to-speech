import { after, before, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'demo-classroom-tts';
const ownerId = 'owner';
const lessonPath = `users/${ownerId}/lessons/lesson-1`;

let testEnvironment: RulesTestEnvironment;

function lesson(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    revision: 1,
    title: 'Lesson',
    rawText: 'Hello',
    folderId: null,
    speechList: [],
    settings: {},
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile('firestore.rules', 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

after(async () => {
  await testEnvironment.cleanup();
});

test('only the owner can create and update a lesson with the next revision', async () => {
  const ownerDb = testEnvironment.authenticatedContext(ownerId).firestore();
  const strangerDb = testEnvironment.authenticatedContext('stranger').firestore();

  await assertSucceeds(setDoc(doc(ownerDb, lessonPath), lesson()));
  await assertFails(updateDoc(doc(strangerDb, lessonPath), { revision: 2, title: 'Hijacked' }));
  await assertFails(updateDoc(doc(ownerDb, lessonPath), { revision: 3, title: 'Skipped' }));
  await assertSucceeds(updateDoc(doc(ownerDb, lessonPath), { revision: 2, title: 'Updated' }));
});

test('requires a deleting tombstone before final lesson deletion', async () => {
  const ownerDb = testEnvironment.authenticatedContext(ownerId).firestore();
  const lessonRef = doc(ownerDb, lessonPath);

  await assertSucceeds(setDoc(lessonRef, lesson()));
  await assertFails(deleteDoc(lessonRef));
  await assertSucceeds(updateDoc(lessonRef, {
    revision: 2,
    deletionStatus: 'deleting',
    deletionError: null,
  }));
  await assertSucceeds(deleteDoc(lessonRef));
});
