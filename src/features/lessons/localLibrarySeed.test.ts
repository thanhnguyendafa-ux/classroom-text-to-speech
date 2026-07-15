import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultLocalLibrarySeed } from './localLibrarySeed';

test('creates deterministic canonical starter lessons', () => {
  const seed = createDefaultLocalLibrarySeed(1_000_000);
  assert.equal(seed.folders.length, 1);
  assert.equal(seed.folders[0].lessons.length, 2);
  assert.equal(seed.uncategorized.length, 1);
  assert.equal(seed.folders[0].createdAt, 1_000_000);
  assert.equal(seed.uncategorized[0].schemaVersion, 1);
  assert.equal(seed.uncategorized[0].createdAt, 900_000);
});
