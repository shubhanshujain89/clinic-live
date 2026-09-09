import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAppPageForRoute } from './AppNew';
import { buildTrackingHref } from './lib/trackingLink';

test('site admin route is blocked for clinic admins', () => {
  assert.equal(resolveAppPageForRoute('/site/admin', 'CLINIC_ADMIN'), 'clinic-admin');
});

test('site admin route is allowed for super admins', () => {
  assert.equal(resolveAppPageForRoute('/site/admin', 'SUPER_ADMIN'), 'site-admin');
});

test('site admin route opens the dedicated admin login when unauthenticated', () => {
  assert.equal(resolveAppPageForRoute('/site/admin', null), 'site-admin');
});

test('staff queue route stays outside the admin route', () => {
  assert.equal(resolveAppPageForRoute('/site/queue', 'STAFF'), 'clinic-queue');
  assert.equal(resolveAppPageForRoute('/site/queue', 'DOCTOR'), 'clinic-queue');
});

test('site login route opens the login page', () => {
  assert.equal(resolveAppPageForRoute('/site/login', null), 'login');
});

test('login route stays on the login page when no authenticated user is present', () => {
  assert.equal(resolveAppPageForRoute('/login', null), 'login');
});

test('login route redirects a logged-in clinic admin to the dashboard', () => {
  assert.equal(resolveAppPageForRoute('/login', 'CLINIC_ADMIN'), 'clinic-admin');
  assert.equal(resolveAppPageForRoute('/login', 'SUPER_ADMIN'), 'site-admin');
});

test('booking confirmation can point users to a prefilled live tracking URL', () => {
  assert.equal(buildTrackingHref('+91 98765 43210'), '/track?mobile=9876543210');
  assert.equal(buildTrackingHref('9876543210'), '/track?mobile=9876543210');
});
