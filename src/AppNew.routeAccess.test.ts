import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAppPageForRoute } from './AppNew';

test('site admin route is blocked for clinic admins', () => {
  assert.equal(resolveAppPageForRoute('/site/admin', 'CLINIC_ADMIN'), 'clinic-admin');
});

test('site admin route is allowed for super admins', () => {
  assert.equal(resolveAppPageForRoute('/site/admin', 'SUPER_ADMIN'), 'site-admin');
});

test('site login route opens the login page', () => {
  assert.equal(resolveAppPageForRoute('/site/login', null), 'login');
});
