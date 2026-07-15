import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRateLimitIdentity } from './requestIdentity';

test('uses IP identity for anonymous requests', async () => {
  const identity = await resolveRateLimitIdentity(
    { headers: {}, socket: { remoteAddress: '10.0.0.2' } },
    async () => ({ uid: 'unused' }),
  );
  assert.equal(identity, 'ip:10.0.0.2');
});

test('uses verified uid instead of IP when bearer token exists', async () => {
  const identity = await resolveRateLimitIdentity(
    { headers: { authorization: 'Bearer valid-token' } },
    async (token) => {
      assert.equal(token, 'valid-token');
      return { uid: 'user-123' };
    },
  );
  assert.equal(identity, 'user:user-123');
});

test('rejects invalid authorization headers', async () => {
  await assert.rejects(
    resolveRateLimitIdentity(
      { headers: { authorization: 'Basic invalid' } },
      async () => ({ uid: 'unused' }),
    ),
    { status: 401, code: 'INVALID_AUTH_TOKEN' },
  );
});
