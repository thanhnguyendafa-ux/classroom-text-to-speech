import assert from 'node:assert/strict';
import test from 'node:test';
import { buildContentSecurityPolicy, resolveAllowedOrigin } from './httpSecurity';

test('allows only explicitly configured origins', () => {
  assert.equal(resolveAllowedOrigin('https://classroom.example', 'https://classroom.example'), 'https://classroom.example');
  assert.equal(resolveAllowedOrigin('https://evil.example', 'https://classroom.example'), null);
});

test('does not enable cross-origin access by default', () => {
  assert.equal(resolveAllowedOrigin('https://classroom.example', ''), null);
});

test('builds a restrictive reportable content security policy', () => {
  const policy = buildContentSecurityPolicy();
  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /base-uri 'self'/);
  assert.match(policy, /frame-ancestors 'self'/);
  assert.doesNotMatch(policy, /default-src \*/);
});
