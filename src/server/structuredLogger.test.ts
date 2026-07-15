import assert from 'node:assert/strict';
import test from 'node:test';
import { createStructuredLogger } from './structuredLogger';

test('emits structured JSON and redacts credentials and identity fields', () => {
  const lines: string[] = [];
  const log = createStructuredLogger({ error: line => lines.push(line) });
  log.error('request_failed', { apiKey: 'AIza-secret', authorization: 'Bearer token', email: 'person@example.com', nested: { password: 'pw' }, safe: 'visible' });
  const event = JSON.parse(lines[0]);
  assert.equal(event.event, 'request_failed');
  assert.equal(event.apiKey, '[REDACTED]');
  assert.equal(event.authorization, '[REDACTED]');
  assert.equal(event.email, '[REDACTED]');
  assert.equal(event.nested.password, '[REDACTED]');
  assert.equal(event.safe, 'visible');
  assert.equal(typeof event.timestamp, 'string');
});
