import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('landing page and contact copy remove the defunct app-download stat and unsupported 24/7 wording', () => {
  const landingPageSource = readFileSync(new URL('./pages/LandingPage.tsx', import.meta.url), 'utf8');
  const contactPageSource = readFileSync(new URL('./pages/ContactPage.tsx', import.meta.url), 'utf8');

  assert.ok(!landingPageSource.includes('0</strong><small>App downloads</small>'));
  assert.ok(!contactPageSource.includes('24/7'));
});

test('how it works route opens a dedicated public page', () => {
  assert.equal(resolveAppPageForRoute('/how-it-works', null), 'how-it-works');
});

test('contact page WhatsApp link carries a configurable prefilled message that mirrors the settings model', () => {
  const siteConfigSource = readFileSync(new URL('./lib/siteConfig.ts', import.meta.url), 'utf8');
  const contactPageSource = readFileSync(new URL('./pages/ContactPage.tsx', import.meta.url), 'utf8');

  assert.ok(siteConfigSource.includes('whatsappMessage:'));
  assert.ok(contactPageSource.includes('encodeURIComponent(settings.whatsappMessage'));
});

test('how it works page explains the patient queue workflow instead of duplicating service capabilities', () => {
  const howItWorksPageSource = readFileSync(new URL('./pages/HowItWorksPage.tsx', import.meta.url), 'utf8');
  const whatWeProvidePageSource = readFileSync(new URL('./pages/WhatWeProvidePage.tsx', import.meta.url), 'utf8');

  assert.ok(howItWorksPageSource.includes('PATIENT'));
  assert.ok(howItWorksPageSource.includes('RECEPTION'));
  assert.ok(howItWorksPageSource.includes('DOCTOR'));
  assert.ok(howItWorksPageSource.includes('TV'));
  assert.ok(howItWorksPageSource.includes('Scan QR / Open Link'));
  assert.ok(howItWorksPageSource.includes('See Queue'));
  assert.ok(!howItWorksPageSource.includes('Digital booking'));
  assert.ok(!whatWeProvidePageSource.includes('From scan to turn'));
});

test('booking confirmation can point users to a prefilled live tracking URL', () => {
  assert.equal(buildTrackingHref('+91 98765 43210'), '/track?mobile=9876543210');
  assert.equal(buildTrackingHref('9876543210'), '/track?mobile=9876543210');
});
