import assert from 'node:assert/strict';
import test from 'node:test';
import type { SpeechItem } from '../../types';
import { duplicateSet, joinWithNext, updateSpeechItem, ungroupSet } from './speechItemCommands';

const items: SpeechItem[] = [
  { id: 'a', text: 'A', detectedLang: 'en', selectedLang: 'auto', resolvedLang: 'en', repeats: 1, delaySec: 2, speed: 1, setId: 'set-1' },
  { id: 'b', text: 'B', detectedLang: 'vi', selectedLang: 'auto', resolvedLang: 'vi', repeats: 1, delaySec: 2, speed: 1, setId: 'set-1' },
  { id: 'c', text: 'C', detectedLang: 'en', selectedLang: 'auto', resolvedLang: 'en', repeats: 1, delaySec: 2, speed: 1 },
];

test('clamps row configuration updates to supported playback bounds', () => {
  const updated = updateSpeechItem(items, 'a', { repeats: 99, delaySec: 0, speed: 9, selectedLang: 'vi' });
  assert.equal(updated[0].repeats, 10);
  assert.equal(updated[0].delaySec, 0.5);
  assert.equal(updated[0].speed, 2);
  assert.equal(updated[0].resolvedLang, 'vi');
});

test('joins adjacent rows and removes a set assignment', () => {
  const joined = joinWithNext(items, 1, 'set-2');
  assert.equal(joined[1].setId, 'set-2');
  assert.equal(joined[2].setId, 'set-2');
  assert.equal(ungroupSet(joined, 'set-2')[1].setId, undefined);
});

test('duplicates a set immediately after its last member', () => {
  const result = duplicateSet(items, 'set-1', { createSetId: () => 'set-copy', createRowId: (id) => `${id}-copy` });
  assert.deepEqual(result.map((item) => item.id), ['a', 'b', 'a-copy', 'b-copy', 'c']);
  assert.equal(result[2].setId, 'set-copy');
});
