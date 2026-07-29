import assert from 'node:assert/strict';
import test from 'node:test';

test('client Firestore database ID is optional and normalized', async () => {
  const configModule = await import('./firebaseClientConfig').catch(() => null);
  assert.ok(configModule, 'firebaseClientConfig must provide the canonical client resolver');

  assert.equal(configModule.resolveFirestoreDatabaseId({}), undefined);
  assert.equal(configModule.resolveFirestoreDatabaseId({ firestoreDatabaseId: '  ' }), undefined);
  assert.equal(
    configModule.resolveFirestoreDatabaseId({ firestoreDatabaseId: ' lesson-db ' }),
    'lesson-db',
  );
});
