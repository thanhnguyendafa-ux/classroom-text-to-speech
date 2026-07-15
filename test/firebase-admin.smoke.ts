import assert from 'node:assert/strict';
import test from 'node:test';
import { checkFirestoreConnection } from '../src/server/storage';

test('Firebase Admin connects through the Firestore emulator', async () => {
  assert.equal(await checkFirestoreConnection(), true);
});
