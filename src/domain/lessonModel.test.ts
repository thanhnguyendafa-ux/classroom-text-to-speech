import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLessonDraft, hydrateLessonDocument, normalizeSharePlaylistPayload, normalizeSpeechItem } from './lessonModel';

test('canonical lesson model normalizes speech items', () => {
  const item = normalizeSpeechItem({ text: ' Xin chào ', detectedLang: 'vi', selectedLang: 'auto', resolvedLang: 'vi', repeats: 99, delaySec: 99, imageUrl: 'javascript:alert(1)' });
  assert.equal(item.text, 'Xin chào');
  assert.equal(item.repeats, 10);
  assert.equal(item.delaySec, 30);
  assert.equal(item.imageUrl, undefined);
});

test('canonical lesson model hydrates legacy documents', () => {
  const lesson = hydrateLessonDocument('lesson-1', { title: 'Bài học', rawText: 'hello', speechList: [{ text: 'hello' }], createdAt: 1, updatedAt: 2 });
  assert.equal(lesson.schemaVersion, 1);
  assert.equal(lesson.speechList.length, 1);
});

test('canonical lesson model builds normalized drafts', () => {
  const draft = buildLessonDraft({ title: '  Bài học  ', rawText: 'hello', speechList: [], settings: { speed: 99, timeBetweenLines: 2, rowLayoutMode: 'below', engineMode: 'browser', selectedPremiumVoiceEn: 'Zephyr', selectedPremiumVoiceVi: 'Kore', selectedPremiumVoiceZhCn: 'Kore', selectedPremiumVoiceZhTw: 'Zephyr', selectedPremiumVoiceJa: 'Zephyr', selectedPremiumVoiceKo: 'Kore', selectedEnVoiceName: '', selectedViVoiceName: '', selectedZhCnVoiceName: '', selectedZhTwVoiceName: '', selectedJaVoiceName: '', selectedKoVoiceName: '', autoGroupSet: false, setMultiplier: 1, useUniversalImage: false, universalImageUrl: '' } });
  assert.equal(draft.title, 'Bài học');
  assert.equal(draft.settings.speed, 3);
});

test('canonical shared playlist normalization is bounded', () => {
  const payload = normalizeSharePlaylistPayload({ speechList: [{ text: 'hello' }] });
  assert.equal(payload.speechList.length, 1);
  assert.equal(payload.playlistLoopMode, 'once');
});
