import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAllowedOrigin } from './httpSecurity';

test('allows only explicitly configured origins', () => {
  assert.equal(resolveAllowedOrigin('https://classroom.example', 'https://classroom.example'), 'https://classroom.example');
  assert.equal(resolveAllowedOrigin('https://evil.example', 'https://classroom.example'), null);
});

test('does not enable cross-origin access by default', () => {
  assert.equal(resolveAllowedOrigin('https://classroom.example', ''), null);
});
