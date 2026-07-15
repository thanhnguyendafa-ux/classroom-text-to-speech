import { after, before, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { ref, uploadBytes } from 'firebase/storage';

let environment: RulesTestEnvironment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-classroom-tts',
    storage: { rules: await readFile('storage.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await environment.clearStorage();
});

after(async () => {
  await environment.cleanup();
});

test('only the lesson owner can upload premium audio', async () => {
  const ownerStorage = environment.authenticatedContext('owner').storage();
  const strangerStorage = environment.authenticatedContext('stranger').storage();
  const path = 'users/owner/lessons/lesson-1/premium-audio/audio-1.wav';
  const wav = new Blob(['audio'], { type: 'audio/wav' });

  await assertSucceeds(uploadBytes(ref(ownerStorage, path), wav));
  await assertFails(uploadBytes(ref(strangerStorage, path), wav));
});

test('rejects non-audio files in premium audio storage', async () => {
  const ownerStorage = environment.authenticatedContext('owner').storage();
  const path = 'users/owner/lessons/lesson-1/premium-audio/payload.txt';
  const text = new Blob(['not audio'], { type: 'text/plain' });

  await assertFails(uploadBytes(ref(ownerStorage, path), text));
});
