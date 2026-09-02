import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { verifyPassword } from './password';

const pbkdf2Hash = (password: string, saltHex?: string) => {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256');
  return `${salt.toString('hex')}:${key.toString('hex')}`;
};

test('verifyPassword accepts PBKDF2 hashes created in the browser', () => {
  const password = 'Clinic@123';
  const storedHash = pbkdf2Hash(password);
  assert.equal(verifyPassword(password, storedHash), true);
});

test('verifyPassword accepts scrypt hashes from the server', () => {
  const password = 'Clinic@123';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  assert.equal(verifyPassword(password, `${salt}:${hash}`), true);
});
