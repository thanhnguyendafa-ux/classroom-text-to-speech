import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSpeechListImport } from './speechListImport';

test('imports raw arrays and metadata-wrapped speech items through canonical normalization', () => {
  assert.equal(parseSpeechListImport(JSON.stringify([{ text: 'Hi', repeats: 99 }]))[0].repeats, 10);
  assert.equal(parseSpeechListImport(JSON.stringify({ items: [{ text: 'Hello' }] }))[0].text, 'Hello');
});

test('rejects malformed, unsupported, and empty imports', () => {
  assert.throws(() => parseSpeechListImport('{broken'));
  assert.throws(() => parseSpeechListImport(JSON.stringify({ speechList: [] })));
  assert.throws(() => parseSpeechListImport(JSON.stringify([])));
});
