import assert from 'node:assert/strict';
import test from 'node:test';
import { nextRateLimitState } from './rateLimiter';

test('starts a new window after expiry', () => {
  assert.deepEqual(nextRateLimitState(undefined, 1_000, 10_000, 3), {
    success: true,
    points: 1,
    limit: 3,
    remaining: 2,
    resetTime: 11_000,
  });
});

test('rejects requests after the distributed quota is exhausted', () => {
  assert.deepEqual(nextRateLimitState({ points: 3, resetTime: 5_000 }, 2_000, 10_000, 3), {
    success: false,
    points: 3,
    limit: 3,
    remaining: 0,
    resetTime: 5_000,
  });
});
