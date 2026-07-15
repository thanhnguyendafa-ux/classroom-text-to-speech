import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSpeechItems, detectLanguage, parseLineSymbols } from './speechItemFactory';

test('parses repeat and delay markers while preserving defaults', () => {
  assert.deepEqual(parseLineSymbols('  hello ; 3 / 4.5  ', 1, 2), { cleanText: 'hello', repeats: 3, delaySec: 4.5 });
});

test('detects supported languages from visible script and Vietnamese diacritics', () => {
  assert.equal(detectLanguage('Xin chào'), 'vi');
  assert.equal(detectLanguage('你好'), 'zh-cn');
  assert.equal(detectLanguage('繁體中文'), 'zh-tw');
  assert.equal(detectLanguage('こんにちは'), 'ja');
  assert.equal(detectLanguage('안녕하세요'), 'ko');
  assert.equal(detectLanguage('hello'), 'en');
});

test('builds deterministic grouped bilingual items', () => {
  const items = buildSpeechItems({
    sourceText: 'Xin chào\nHello\nThird',
    timeBetweenLines: 2,
    speed: 1,
    autoGroupSet: true,
    setMultiplier: 2,
    createId: (kind, index) => `${kind}-${index}`,
  });

  assert.equal(items.length, 5);
  assert.equal(items[0].setId, 'set-0');
  assert.equal(items[1].setId, 'set-0');
  assert.equal(items[2].setId, 'set-1');
  assert.equal(items[4].text, 'Third');
});
