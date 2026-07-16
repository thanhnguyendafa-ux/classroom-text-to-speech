import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearGeminiApiKey,
  loadGeminiApiKey,
  saveGeminiApiKey,
} from './geminiApiKeyStorage';

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    has: (key: string) => values.has(key),
  };
}

test('migrates a legacy local key into session storage and removes the legacy copy', () => {
  const session = createStorage();
  const local = createStorage({ userGeminiApiKey: 'legacy-secret' });

  assert.equal(loadGeminiApiKey(session, local), 'legacy-secret');
  assert.equal(session.getItem('userGeminiApiKey'), 'legacy-secret');
  assert.equal(local.has('userGeminiApiKey'), false);
});

test('saves and clears only the Gemini key from both browser stores', () => {
  const session = createStorage({ unrelated: 'keep' });
  const local = createStorage({ unrelated: 'keep' });

  saveGeminiApiKey('  fresh-secret  ', session);
  assert.equal(session.getItem('userGeminiApiKey'), 'fresh-secret');
  clearGeminiApiKey(session, local);
  assert.equal(session.has('userGeminiApiKey'), false);
  assert.equal(local.has('userGeminiApiKey'), false);
  assert.equal(session.getItem('unrelated'), 'keep');
  assert.equal(local.getItem('unrelated'), 'keep');
});
