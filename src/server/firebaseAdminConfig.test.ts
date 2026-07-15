import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveFirebaseAdminConfig } from './firebaseAdminConfig';

test('environment config overrides the checked-in client config', () => {
  assert.deepEqual(
    resolveFirebaseAdminConfig(
      { projectId: 'client-project', firestoreDatabaseId: 'client-db' },
      { FIREBASE_PROJECT_ID: 'server-project', FIRESTORE_DATABASE_ID: 'server-db' },
    ),
    { projectId: 'server-project', databaseId: 'server-db' },
  );
});

test('requires an explicit project id', () => {
  assert.throws(
    () => resolveFirebaseAdminConfig({}, {}),
    /FIREBASE_PROJECT_ID/,
  );
});
