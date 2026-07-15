import assert from 'node:assert/strict';
import test from 'node:test';
import { adminDb } from '../src/server/firebaseAdmin';
import { PlaylistStorageManager, type PlaylistPayload } from '../src/server/storage';

test('playlist reads stay consistent with Firestore SSOT', async () => {
  const shareId = `smoke-${Date.now()}`;
  const payload: PlaylistPayload = {
    speechList: [{
      id: 'item-1',
      text: 'hello',
      detectedLang: 'en',
      selectedLang: 'en',
      resolvedLang: 'en',
      repeats: 1,
    }],
    speed: 1,
    volume: 1,
    autoAdvance: true,
    timeBetweenLines: 2,
    playlistLoopMode: 'once' as const,
    engineMode: 'browser' as const,
    createdAt: new Date().toISOString(),
  };

  await PlaylistStorageManager.savePlaylist(shareId, payload);
  await adminDb.collection('playlists').doc(shareId).update({ speed: 1.5 });

  const loaded = await PlaylistStorageManager.getPlaylist(shareId);
  assert.equal(loaded?.speed, 1.5);
});
