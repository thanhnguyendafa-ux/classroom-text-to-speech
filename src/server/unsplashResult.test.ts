import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeUnsplashResults } from './unsplashResult';

test('normalizes unknown Unsplash data and drops malformed records', () => {
  const results = normalizeUnsplashResults({ results: [
    { id: '1', urls: { regular: 'https://image', thumb: 'https://thumb' }, user: { name: 'Author', links: { html: 'https://author' } } },
    { id: '2', urls: {} },
    null,
  ] });
  assert.deepEqual(results, [{ id: '1', url: 'https://image', thumb: 'https://thumb', author: 'Author', authorUrl: 'https://author' }]);
});

test('returns an empty list for non-object provider responses', () => {
  assert.deepEqual(normalizeUnsplashResults('bad response'), []);
});
