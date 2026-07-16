import assert from 'node:assert/strict';
import test from 'node:test';
import { googleAuthErrorMessage, shouldOfferRedirectFallback } from './googleAuthError';

test('explains unauthorized domains without exposing provider details', () => {
  assert.match(googleAuthErrorMessage('auth/unauthorized-domain'), /tên miền/i);
});

test('explains a disabled Google provider', () => {
  assert.match(googleAuthErrorMessage('auth/operation-not-allowed'), /chưa được bật/i);
});

test('offers redirect fallback only when popup usage is blocked', () => {
  assert.equal(shouldOfferRedirectFallback('auth/popup-blocked'), true);
  assert.equal(shouldOfferRedirectFallback('auth/popup-closed-by-user'), false);
});

test('returns a safe fallback for unknown provider errors', () => {
  assert.equal(
    googleAuthErrorMessage('auth/unexpected-provider-error'),
    'Không thể đăng nhập bằng Google. Vui lòng thử lại.',
  );
});
