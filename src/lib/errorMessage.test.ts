import assert from 'node:assert/strict';
import test from 'node:test';
import { errorCode, errorMessage } from './errorMessage';

test('normalizes unknown errors without unsafe property access', () => {
  assert.equal(errorMessage(new Error('failed')), 'failed');
  assert.equal(errorMessage({ message: 'object failed' }), 'object failed');
  assert.equal(errorMessage('string failed'), 'string failed');
  assert.equal(errorMessage(null, 'fallback'), 'fallback');
  assert.equal(errorCode({ code: 'auth/popup-blocked' }), 'auth/popup-blocked');
  assert.equal(errorCode(new Error('failed')), null);
});
