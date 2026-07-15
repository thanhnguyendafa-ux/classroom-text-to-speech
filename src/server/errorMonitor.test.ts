import assert from 'node:assert/strict';
import test from 'node:test';
import { createErrorMonitor } from './errorMonitor';

test('does nothing when monitoring endpoint is not configured', async () => {
  let requests = 0;
  const monitor = createErrorMonitor({ endpoint: '', fetch: async () => { requests += 1; return {} as Response; } });
  await monitor.report('api_failed', { code: 'INTERNAL_ERROR' });
  assert.equal(requests, 0);
});

test('sends sanitized structured events and absorbs provider failures', async () => {
  const bodies: string[] = [];
  const monitor = createErrorMonitor({ endpoint: 'https://monitor.example/events', fetch: async (_url, init) => { bodies.push(String(init?.body)); throw new Error('monitor offline'); } });
  await assert.doesNotReject(() => monitor.report('api_failed', { apiKey: 'AIza-secret', authorization: 'Bearer token', safe: 'visible' }));
  const body = JSON.parse(bodies[0]);
  assert.equal(body.event, 'api_failed');
  assert.equal(body.context.apiKey, '[REDACTED]');
  assert.equal(body.context.authorization, '[REDACTED]');
  assert.equal(body.context.safe, 'visible');
});
