import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSuperAdminBootstrapPassword } from './bootstrap.js';

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