import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAuthHeaders } from './authenticatedFetch';

test('adds a bearer token without replacing caller headers', () => {
  assert.deepEqual(buildAuthHeaders({ 'Content-Type': 'application/json' }, 'token-1'), {
    'Content-Type': 'application/json',
    Authorization: 'Bearer token-1',
  });
});

test('keeps requests anonymous when no user token exists', () => {
  assert.deepEqual(buildAuthHeaders({ Accept: 'application/json' }, null), {
    Accept: 'application/json',
  });
});
