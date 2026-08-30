/**
 * Database API Layer
 * Provides the MySQL-backed repository and service interface used by the app.
 */

import { repositories } from './db/repositories/index.js';
import { services } from './db/services/index.js';
import crypto from 'crypto';

// Re-export password utilities
export const DEFAULT_USER_PASSWORD = 'Clinic@123';

export const hashPassword = (password: string, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, storedHash: string) => {
  const [salt, expected] = String(storedHash || '').split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
};

// User authentication
export const findUserByEmail = async (email: string) => {
  const user = await repositories.staffUsers.findByEmail(email);
  if (!user) return null;
  return {
    id: user.id,
    clinicId: user.clinicId,
    doctorId: user.doctorId,
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role,
    displayName: user.displayName,
  };
};

export const resetUserPassword = async (userId: string, defaultPassword: string = DEFAULT_USER_PASSWORD) => {
  const passwordHash = hashPassword(defaultPassword);
  await repositories.staffUsers.updatePassword(userId, passwordHash, `Default: ${defaultPassword}`);
  return { ok: true, defaultPassword };
};

// Public booking
export const createPublicBooking = async (input: {
  clinicId: string;
  doctorId: string;
  patientName: string;
  phone: string;
  age?: number;
  reason?: string;
}) => {
  return services.booking.createPublicBooking(input);
};

// Public tracking
export const getPublicTracking = async (trackingId: string) => {
  return services.tracking.getPublicTracking(trackingId);
};

// Generic database operations (for backward compatibility with existing API)
const tableMap: Record<string, string> = {
  clinics: 'clinics',
  doctors: 'doctors',
  users: 'staff_users',
  staff_users: 'staff_users',
  staff: 'staff_users',
  patients: 'patients',
  sessions: 'sessions',
  queue_sessions: 'sessions',
  appointments: 'appointments',
  tokens: 'tokens',
  queue_events: 'queue_events',
  doctor_status: 'doctor_status',
  settings: 'settings',
  whatsapp_logs: 'whatsapp_logs',
};

const extractTableName = (pathValue: string) => {
  const cleaned = pathValue.replace(/^\/+|\/+$/g, '').trim();
  const firstSegment = cleaned.split('/')[0] || '';
  return tableMap[firstSegment] || firstSegment || 'settings';
};

const extractRecordId = (pathValue: string) => {
  const cleaned = pathValue.replace(/^\/+|\/+$/g, '').trim();
  const segments = cleaned.split('/').filter(Boolean);
  return segments.length > 1 ? segments[1] : null;
};

const normalizeKey = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

// Map repository methods to generic CRUD operations
const repositoryMap: Record<string, any> = {
  clinics: repositories.clinics,
  doctors: repositories.doctors,
  staff_users: repositories.staffUsers,
  patients: repositories.patients,
  sessions: repositories.sessions,
  appointments: repositories.appointments,
  tokens: repositories.tokens,
  queue_events: repositories.queueEvents,
  doctor_status: repositories.doctorStatus,
  settings: repositories.settings,
  whatsapp_logs: repositories.whatsAppLogs,
};

export const listQuery = async (pathValue: string, clauses: Array<{ field: string; op?: string; value?: any }> = []) => {
  const table = extractTableName(pathValue);
  const repo = repositoryMap[table];
  
  if (!repo) {
    // Fallback for unknown tables
    return [];
  }

  const where: Record<string, any> = {};
  clauses.forEach((clause) => {
    const field = normalizeKey(clause.field);
    const op = clause.op || '==';
    const value = clause.value;
    if (op === '==') {
      where[field] = value;
    }
  });

  return repo.findAll({ where });
};

export const readDoc = async (pathValue: string) => {
  const table = extractTableName(pathValue);
  const id = extractRecordId(pathValue);
  if (!id) return null;

  const repo = repositoryMap[table];
  if (!repo) return null;

  return repo.findById(id);
};

export const writeDoc = async (pathValue: string, value: Record<string, any>) => {
  const table = extractTableName(pathValue);
  const repo = repositoryMap[table];

  if (!repo) {
    throw new Error(`Unknown table: ${table}`);
  }

  const requestedId = extractRecordId(pathValue);
  const id = value?.id || requestedId || crypto.randomUUID();
  const payload = { ...value, id };

  const existing = await repo.findById(id);
  if (existing) {
    await repo.update(id, payload);
    return { id: existing.id, path: `${table}/${existing.id}` };
  }

  const result = await repo.create(payload);
  return { id: result.id, path: `${table}/${result.id}` };
};

export const updateDoc = async (pathValue: string, value: Record<string, any>) => {
  const table = extractTableName(pathValue);
  const id = extractRecordId(pathValue) || value?.id;
  if (!id) throw new Error(`Cannot update document without an id: ${pathValue}`);

  const repo = repositoryMap[table];
  if (!repo) throw new Error(`Unknown table: ${table}`);

  await repo.update(id, value);
  return { id };
};

export const deleteDoc = async (pathValue: string) => {
  const table = extractTableName(pathValue);
  const id = extractRecordId(pathValue);
  if (!id) return;

  const repo = repositoryMap[table];
  if (!repo) return;

  await repo.delete(id);
};

// Initialize database connection
export const getDatabase = async () => {
  // Test connection
  const { testConnection } = await import('./db/connection.js');
  const connected = await testConnection();
  if (!connected) {
    throw new Error('Cannot connect to MySQL database. Check your .env configuration.');
  }
  return true;
};

export const closeDatabase = async () => {
  const { closePool } = await import('./db/connection.js');
  await closePool();
};
