import assert from 'node:assert/strict';
import test from 'node:test';

test('health response reports the canonical Firestore connection state', async () => {
  const healthModule = await import('./health').catch(() => null);
  assert.ok(healthModule, 'health module must be shared by Express and Vercel');

  assert.deepEqual(
    await healthModule.createHealthResponse(async () => true),
    {
      statusCode: 200,
      body: {
        status: 'ok',
        service: 'classroom-text-to-speech-api',
        firestore: 'connected',
      },
    },
  );

  assert.deepEqual(
    await healthModule.createHealthResponse(async () => false),
    {
      statusCode: 503,
      body: {
        status: 'degraded',
        service: 'classroom-text-to-speech-api',
        firestore: 'unavailable',
      },
    },
  );
});
