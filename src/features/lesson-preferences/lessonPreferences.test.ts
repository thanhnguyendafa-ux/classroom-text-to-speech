import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLoopMode, parseRowLayoutMode, readStoredValue } from './lessonPreferences';

test('reads stored values only when present', () => {
  const storage = { getItem: (key: string) => key === 'volume' ? '1.25' : null };
  assert.equal(readStoredValue(storage, 'volume', '1'), '1.25');
  assert.equal(readStoredValue(storage, 'missing', 'fallback'), 'fallback');
});

test('normalizes constrained preference values', () => {
  assert.equal(parseLoopMode('infinite'), 'infinite');
  assert.equal(parseLoopMode('invalid'), 'once');
  assert.equal(parseRowLayoutMode('side'), 'side');
  assert.equal(parseRowLayoutMode('invalid'), 'below');
});
