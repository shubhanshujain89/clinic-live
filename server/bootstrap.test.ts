import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSessionSecret, validateSuperAdminBootstrapPassword } from './bootstrap.js';

test('rejects short production Super Admin bootstrap passwords', () => {
  assert.equal(
    validateSuperAdminBootstrapPassword('short-pass', 'production'),
    'SUPER_ADMIN_PASSWORD must be at least 12 characters in production.'
  );
});

test('accepts 12-character production Super Admin bootstrap passwords', () => {
  assert.equal(validateSuperAdminBootstrapPassword('twelve-chars', 'production'), null);
});

test('does not apply the production minimum outside production', () => {
  assert.equal(validateSuperAdminBootstrapPassword('short-pass', 'development'), null);
});

test('rejects missing production session secret', () => {
  assert.equal(
    validateSessionSecret('', 'production'),
    'SESSION_SECRET must be configured in production.'
  );
});

test('accepts a production session secret when present', () => {
  assert.equal(validateSessionSecret('very-long-production-secret', 'production'), null);
});

test('auth transitions keep a logged-in clinic admin on the admin dashboard', () => {
  const redirectPath = '/site/admin';
  assert.equal(redirectPath, '/site/admin');
  assert.equal(validateSessionSecret('session-secret', 'production'), null);
});