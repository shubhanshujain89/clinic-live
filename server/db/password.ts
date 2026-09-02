/**
 * Shared password hashing/verification utilities.
 * Used by both db.ts and StaffUserRepository to prevent logic drift.
 */

import crypto from 'crypto';

export const hashPassword = (password: string, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, storedHash: string) => {
  const normalizedHash = String(storedHash || '');
  const [salt, expected] = normalizedHash.split(':');
  if (!salt || !expected) return false;

  try {
    const scryptActual = crypto.scryptSync(password, salt, 64).toString('hex');
    if (crypto.timingSafeEqual(Buffer.from(scryptActual, 'hex'), Buffer.from(expected, 'hex'))) {
      return true;
    }
  } catch {
    // Ignore malformed scrypt hashes and try the PBKDF2 compatibility path below.
  }

  try {
    const pbkdf2Salt = Buffer.from(salt, 'hex');
    const pbkdf2Actual = crypto.pbkdf2Sync(password, pbkdf2Salt, 100000, 64, 'sha256').toString('hex');
    if (crypto.timingSafeEqual(Buffer.from(pbkdf2Actual, 'hex'), Buffer.from(expected, 'hex'))) {
      return true;
    }
  } catch {
    // Invalid format or malformed hash; reject safely.
  }

  return false;
};