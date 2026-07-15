import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeCleanupResults } from './lessonDeletion';

test('finalizes deletion only when every cleanup operation succeeds', () => {
  assert.deepEqual(summarizeCleanupResults([{ status: 'fulfilled' }, { status: 'fulfilled' }]), { canFinalize: true, failureCount: 0 });
});

test('keeps a retryable tombstone when any cleanup operation fails', () => {
  assert.deepEqual(summarizeCleanupResults([{ status: 'fulfilled' }, { status: 'rejected' }]), { canFinalize: false, failureCount: 1 });
});
