import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, normalizeApiError } from './apiError';

test('preserves safe public errors', () => {
  assert.deepEqual(normalizeApiError(new ApiError(400, 'INVALID_INPUT', 'Dữ liệu không hợp lệ.')), {
    status: 400,
    body: { code: 'INVALID_INPUT', error: 'Dữ liệu không hợp lệ.' },
    logCode: 'INVALID_INPUT',
  });
});

test('does not expose unknown provider errors or secrets', () => {
  const normalized = normalizeApiError(new Error('Gemini rejected key AIza-secret-value'));
  assert.equal(normalized.status, 500);
  assert.deepEqual(normalized.body, {
    code: 'INTERNAL_ERROR',
    error: 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại.',
  });
  assert.doesNotMatch(JSON.stringify(normalized), /AIza-secret-value/);
});
