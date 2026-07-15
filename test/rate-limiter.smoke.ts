import assert from 'node:assert/strict';
import test from 'node:test';
import { createRateLimiter } from '../src/server/rateLimiter';

test('concurrent consumers share one Firestore quota', async () => {
  const limiter = createRateLimiter({
    keyPrefix: `smoke_${Date.now()}`,
    maxRequests: 2,
    windowMs: 60_000,
  });

  const results = await Promise.all([
    limiter.consume('same-user'),
    limiter.consume('same-user'),
    limiter.consume('same-user'),
  ]);

  assert.equal(results.filter((result) => result.success).length, 2);
  assert.equal(results.filter((result) => !result.success).length, 1);
  assert.equal((await limiter.consume('same-user')).success, false);
});
